import torch
import torch.nn.functional as F
import json
import os
import argparse
from model import SynapseNexusPredictor
from dataset import get_dataloaders
import config

def evaluate_model(model, loader, device, return_samples=False):
    model.eval()
    
    total_samples = 0
    sum_min_ade_3 = 0.0
    sum_min_fde_3 = 0.0
    misses_2_3 = 0
    
    off_road_steps = 0
    total_steps = 0
    
    intent_correct = 0
    
    with torch.no_grad():
        for batch in loader:
            batch_device = {k: v.to(device) if torch.is_tensor(v) else v for k, v in batch.items()}
            
            out = model(
                batch_device['agent'],
                batch_device['neighbours'],
                batch_device['neigh_mask'],
                batch_device['map']
            )
            
            trajectories = out['trajectories'] # (B, 3, 6, 2)
            log_probs = out['log_probs']       # (B, 3)
            intent_logits = out['intent_logits'] # (B, 4)
            gt_future = batch_device['future']     # (B, 6, 2)
            gt_intent = batch_device['intent'].squeeze(-1) # (B,)
            map_raster = batch_device['map']       # (B, 3, 100, 100)
            
            B, K, T, _ = trajectories.shape
            
            # intent acc
            pred_intent = intent_logits.argmax(dim=-1)
            intent_correct += (pred_intent == gt_intent).sum().item()
            
            # reshape gt for distance computation
            gt_exp = gt_future.unsqueeze(1).expand(-1, K, -1, -1) # (B, K, T, 2)
            
            # dists: (B, K, T)
            dists = torch.norm(trajectories - gt_exp, dim=-1)
            
            fde_per_mode = dists[:, :, -1] # (B, K)
            ade_per_mode = dists.mean(dim=-1) # (B, K)
            
            min_fde, winner_fde_idx = fde_per_mode.min(dim=-1)
            min_ade = ade_per_mode.gather(1, winner_fde_idx.unsqueeze(-1)).squeeze(-1)
            
            sum_min_ade_3 += min_ade.sum().item()
            sum_min_fde_3 += min_fde.sum().item()
            
            misses_2_3 += (min_fde > config.MISS_RATE_DIST).sum().item()
            total_samples += B
            
            # OffRoadRate
            best_mode = log_probs.argmax(dim=-1)
            best_traj = trajectories[torch.arange(B), best_mode] # (B, T, 2)
            
            # Map sampling
            pixel_x = (best_traj[..., 0] / config.MAP_RESOLUTION) + config.MAP_SIZE_PX / 2
            pixel_y = -(best_traj[..., 1] / config.MAP_RESOLUTION) + config.MAP_SIZE_PX / 2
            
            grid_x = (pixel_x / (config.MAP_SIZE_PX / 2)) - 1
            grid_y = (pixel_y / (config.MAP_SIZE_PX / 2)) - 1
            
            grid = torch.stack([grid_x, grid_y], dim=-1).unsqueeze(1) # (B, 1, T, 2)
            
            walkway_map = map_raster[:, 0:1, :, :]
            crossing_map = map_raster[:, 1:2, :, :]
            walkable = (walkway_map + crossing_map).clamp(0, 1) # (B, 1, H, W)
            
            sampled = F.grid_sample(walkable, grid, mode='bilinear', padding_mode='zeros', align_corners=False) # (B, 1, 1, T)
            sampled = sampled.squeeze(1).squeeze(1) # (B, T)
            
            off_road_mask = sampled < 0.5
            off_road_steps += off_road_mask.sum().item()
            total_steps += (B * T)
            
    metrics = {
        'minADE_3': sum_min_ade_3 / total_samples if total_samples > 0 else 0,
        'minFDE_3': sum_min_fde_3 / total_samples if total_samples > 0 else 0,
        'MissRate_2_3': misses_2_3 / total_samples if total_samples > 0 else 0,
        'OffRoadRate': off_road_steps / total_steps if total_steps > 0 else 0,
        'intent_accuracy': intent_correct / total_samples if total_samples > 0 else 0
    }
    return metrics

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkpoint', type=str, required=True)
    args = parser.parse_args()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Loading checkpoint {args.checkpoint}...")
    
    model = SynapseNexusPredictor().to(device)
    ckpt = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ckpt['model'])
    
    _, val_loader = get_dataloaders(batch_size=config.BATCH_SIZE)
    
    print("Running evaluation...")
    metrics = evaluate_model(model, val_loader, device)
    
    print("\n--- RESULTS ---")
    print(f"minADE_3:     {metrics['minADE_3']:.4f}")
    print(f"minFDE_3:     {metrics['minFDE_3']:.4f}")
    print(f"MissRate_2_3: {metrics['MissRate_2_3']:.4f}")
    print(f"OffRoadRate:  {metrics['OffRoadRate']:.4f}")
    print(f"Intent Acc:   {metrics['intent_accuracy']:.4f}")
    print("---------------\n")
    
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(config.OUTPUT_DIR, 'results.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
