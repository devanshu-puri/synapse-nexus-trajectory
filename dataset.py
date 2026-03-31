import os
import json
import math
import random
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from nuscenes.nuscenes import NuScenes
from nuscenes.prediction.helper import PredictHelper
from nuscenes.map_expansion.map_api import NuScenesMap
from nuscenes.eval.prediction.splits import get_prediction_challenge_split
import config

class NuScenesTrajectoryDataset(Dataset):
    def __init__(self, split='mini_train', augment=False):
        self.split = split
        self.augment = augment
        
        # Load NuScenes with version and dataroot from config
        self.nusc = NuScenes(version=config.DATASET_VERSION, dataroot=config.DATAROOT)
        self.helper = PredictHelper(self.nusc)
        
        # Load all 4 NuScenesMap objects into a dict keyed by location name
        self.maps = {}
        for mn in ['singapore-onenorth', 'singapore-hollandvillage', 'singapore-queenstown', 'boston-seaport']:
            try:
                self.maps[mn] = NuScenesMap(dataroot=config.DATAROOT, map_name=mn)
            except Exception:
                self.maps[mn] = None
        
        # Get split tokens using get_prediction_challenge_split
        try:
            self.tokens = get_prediction_challenge_split(split, dataroot=config.DATAROOT)
        except Exception:
            print(f"Warning: get_prediction_challenge_split failed for {split}. Generating manually.")
            all_tokens = []
            for instance in self.nusc.instance:
                ann_token = instance['first_annotation_token']
                while ann_token:
                    ann = self.nusc.get('sample_annotation', ann_token)
                    all_tokens.append(f"{instance['token']}_{ann['sample_token']}")
                    ann_token = ann['next']
            split_idx = int(len(all_tokens) * 0.8)
            if 'train' in split:
                self.tokens = all_tokens[:split_idx]
            else:
                self.tokens = all_tokens[split_idx:]
                
        self.samples = []
        self._build_samples(self.tokens)

    def _build_samples(self, tokens):
        for token_pair in tokens:
            if '&' in token_pair:
                instance_token, sample_token = token_pair.split('&')
            else:
                instance_token, sample_token = token_pair.split('_')
                
            ann_record = self.helper.get_sample_annotation(instance_token, sample_token)
            if ann_record is None: continue
            
            category_name = self.nusc.get('category', self.nusc.get('instance', instance_token)['category_token'])['name']
            if category_name not in config.AGENT_CATEGORIES:
                continue
                
            past_xy = self.helper.get_past_for_agent(instance_token, sample_token, seconds=2.0, in_agent_frame=False)
            if past_xy.shape[0] < config.HISTORY_STEPS:
                continue
                
            future_xy = self.helper.get_future_for_agent(instance_token, sample_token, seconds=3.0, in_agent_frame=False)
            if future_xy.shape[0] < config.FUTURE_STEPS:
                continue
                
            past_vel = np.zeros_like(past_xy)
            for t in range(1, config.HISTORY_STEPS):
                past_vel[t] = (past_xy[t] - past_xy[t-1]) / 0.5
            past_vel[0] = past_vel[1]
            
            past_heading = np.arctan2(past_vel[:, 1], past_vel[:, 0]).reshape(-1, 1)
            
            sample_rec = self.nusc.get('sample', sample_token)
            scene = self.nusc.get('scene', sample_rec['scene_token'])
            log = self.nusc.get('log', scene['log_token'])
            map_name = log['location']
            
            origin_xy = past_xy[-1]
            heading = float(past_heading[-1, 0])
            
            past_xy_local = self._to_agent_frame(past_xy, origin_xy, heading)
            past_vel_local = self._to_agent_frame(past_xy + past_vel, origin_xy, heading) - past_xy_local
            future_xy_local = self._to_agent_frame(future_xy, origin_xy, heading)
            
            neighbours, neigh_mask = self._get_neighbours(sample_token, ego_x=origin_xy[0], ego_y=origin_xy[1], ego_heading=heading)
            
            map_raster = self._rasterize_map(map_name, origin_xy[0], origin_xy[1], heading)
            
            intent = self._derive_intent(past_xy_local, future_xy_local, category_name)
            
            self.samples.append({
                'past_xy': past_xy_local,
                'past_vel': past_vel_local,
                'past_heading': past_heading - heading,
                'future_xy': future_xy_local,
                'neighbours': neighbours,
                'neigh_mask': neigh_mask,
                'map_raster': map_raster,
                'intent': intent,
                'map_name': map_name,
                'origin': origin_xy,
                'heading': heading
            })

    def _to_agent_frame(self, coords_global, origin_xy, heading):
        trans = coords_global - origin_xy
        c, s = np.cos(-heading), np.sin(-heading)
        R = np.array([[c, -s], [s, c]])
        return np.dot(trans, R.T)

    def _get_neighbours(self, sample_token, ego_x, ego_y, ego_heading):
        neighbours = np.zeros((config.MAX_NEIGHBOURS, config.HISTORY_STEPS, 4))
        neigh_mask = np.zeros((config.MAX_NEIGHBOURS,), dtype=bool)
        
        sample_rec = self.nusc.get('sample', sample_token)
        anns = [self.nusc.get('sample_annotation', tok) for tok in sample_rec['anns']]
        
        idx = 0
        origin_xy = np.array([ego_x, ego_y])
        for ann in anns:
            pos = np.array(ann['translation'][:2])
            dist = np.linalg.norm(pos - origin_xy)
            if dist == 0 or dist > config.NEIGHBOUR_RADIUS:
                continue
                
            past_xy = self.helper.get_past_for_agent(ann['instance_token'], sample_token, seconds=2.0, in_agent_frame=False)
            
            if len(past_xy) == 0:
                past_xy = np.array([pos])
                
            if len(past_xy) < config.HISTORY_STEPS:
                pad_len = config.HISTORY_STEPS - len(past_xy)
                pad = np.repeat(past_xy[0:1], pad_len, axis=0)
                past_xy = np.concatenate([pad, past_xy], axis=0)
            else:
                past_xy = past_xy[-config.HISTORY_STEPS:]
                
            past_xy_local = self._to_agent_frame(past_xy, origin_xy, ego_heading)
            
            past_vel_local = np.zeros_like(past_xy_local)
            for t in range(1, config.HISTORY_STEPS):
                past_vel_local[t] = (past_xy_local[t] - past_xy_local[t-1]) / 0.5
            past_vel_local[0] = past_vel_local[1]
            
            neighbours[idx] = np.concatenate([past_xy_local, past_vel_local], axis=1)
            neigh_mask[idx] = True
            idx += 1
            if idx >= config.MAX_NEIGHBOURS:
                break
                
        return neighbours, neigh_mask

    def _rasterize_map(self, map_name, ego_x, ego_y, ego_heading):
        nusc_map = self.maps.get(map_name, None)
        if nusc_map is None:
            return np.zeros((3, config.MAP_SIZE_PX, config.MAP_SIZE_PX), dtype=np.float32)
            
        try:
            patch_box = (ego_x, ego_y, config.MAP_SIZE_PX * config.MAP_RESOLUTION, config.MAP_SIZE_PX * config.MAP_RESOLUTION)
            patch_angle = math.degrees(ego_heading)
            layer_names = ['walkway', 'ped_crossing', 'drivable_area']
            canvas_size = (config.MAP_SIZE_PX, config.MAP_SIZE_PX)
            map_mask = nusc_map.get_map_mask(patch_box=patch_box, patch_angle=patch_angle, layer_names=layer_names, canvas_size=canvas_size)
            return map_mask.astype(np.float32)
        except Exception:
            return np.zeros((3, config.MAP_SIZE_PX, config.MAP_SIZE_PX), dtype=np.float32)

    def _derive_intent(self, past_xy, future_xy, category_name):
        dist = np.linalg.norm(future_xy[-1] - past_xy[-1])
        past_dir = past_xy[-1] - past_xy[-2]
        future_dir = future_xy[2] - future_xy[0]
        
        cross_prod = past_dir[0] * future_dir[1] - past_dir[1] * future_dir[0]
        dot_prod = np.dot(past_dir, future_dir)
        angle = math.degrees(math.atan2(cross_prod, dot_prod))
        
        if dist < 0.3:
            intent = 3
        elif abs(angle) > 45 and "pedestrian" in category_name:
            intent = 1
        elif abs(angle) > 30 and "vehicle" in category_name:
            intent = 2
        else:
            intent = 0
            
        return intent

    def _augment(self, past_xy, future_xy, neighbours, map_raster, intent):
        if config.AUG_ROTATE90:
            angle_deg = random.choice([0, 90, 180, 270])
            if angle_deg > 0:
                rad = math.radians(angle_deg)
                c, s = math.cos(rad), math.sin(rad)
                R = np.array([[c, -s], [s, c]])
                
                past_xy = np.dot(past_xy, R.T)
                future_xy = np.dot(future_xy, R.T)
                neighbours[:, :, :2] = np.dot(neighbours[:, :, :2], R.T)
                neighbours[:, :, 2:] = np.dot(neighbours[:, :, 2:], R.T)
                
                k = angle_deg // 90
                map_raster = np.rot90(map_raster, k=k, axes=(1, 2)).copy()
                
                if (angle_deg == 90 or angle_deg == 270) and intent == 1:
                    intent = 1

        if config.AUG_HFLIP and random.random() < 0.5:
            past_xy[:, 1] = -past_xy[:, 1]
            future_xy[:, 1] = -future_xy[:, 1]
            neighbours[:, :, 1] = -neighbours[:, :, 1]
            neighbours[:, :, 3] = -neighbours[:, :, 3]
            map_raster = np.flip(map_raster, axis=2).copy()

        if config.AUG_NOISE_STD > 0:
            past_xy += np.random.normal(0, config.AUG_NOISE_STD, past_xy.shape)

        return past_xy, future_xy, neighbours, map_raster, intent

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        past_xy     = sample['past_xy'].copy()
        past_vel    = sample['past_vel'].copy()
        past_head   = sample['past_heading'].copy()
        future_xy   = sample['future_xy'].copy()
        neighbours  = sample['neighbours'].copy()
        neigh_mask  = sample['neigh_mask'].copy()
        map_raster  = sample['map_raster'].copy()
        intent      = sample['intent']
        map_name    = sample['map_name']
        
        if self.augment:
            past_xy, future_xy, neighbours, map_raster, intent = self._augment(past_xy, future_xy, neighbours, map_raster, intent)
            
        sin_h = np.sin(past_head)
        cos_h = np.cos(past_head)
        agent_features = np.concatenate([past_xy, past_vel, sin_h, cos_h], axis=1)
        
        return {
            'agent':      torch.FloatTensor(agent_features),
            'neighbours': torch.FloatTensor(neighbours),
            'neigh_mask': torch.BoolTensor(neigh_mask),
            'map':        torch.FloatTensor(map_raster),
            'future':     torch.FloatTensor(future_xy),
            'intent':     torch.LongTensor([intent]),
            'map_name':   map_name,
            'origin':     torch.FloatTensor(sample['origin']),
            'heading':    float(sample['heading'])
        }

def get_dataloaders(batch_size=config.BATCH_SIZE):
    train_ds = NuScenesTrajectoryDataset(split='mini_train', augment=True)
    val_ds   = NuScenesTrajectoryDataset(split='mini_val',   augment=False)
    
    # Using small num_workers for demo dataset
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, pin_memory=True, drop_last=True, num_workers=0)
    val_loader   = DataLoader(val_ds, batch_size=batch_size, shuffle=False, pin_memory=True, num_workers=0)
    
    print(f"Train: {len(train_ds)} samples | Val: {len(val_ds)} samples")
    return train_loader, val_loader
