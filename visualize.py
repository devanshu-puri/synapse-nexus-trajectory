import os
import argparse
import random
import torch
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from model import SynapseNexusPredictor
from dataset import get_dataloaders
import config

def visualize(args):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SynapseNexusPredictor().to(device)
    ckpt = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ckpt['model'])
    model.eval()
    
    _, val_loader = get_dataloaders(batch_size=args.n_samples)
    
    # Get one batch
    batch = next(iter(val_loader))
    batch_device = {k: v.to(device) if torch.is_tensor(v) else v for k, v in batch.items()}
    
    with torch.no_grad():
        out = model.predict(
            batch_device['agent'],
            batch_device['neighbours'],
            batch_device['neigh_mask'],
            batch_device['map']
        )
        
    all_traj = out['all_trajectories'].cpu().numpy() # (B, 3, 6, 2)
    mode_probs = out['mode_probs'].cpu().numpy()     # (B, 3)
    pred_intents = out['intent'].cpu().numpy()       # (B,)
    
    past_xy = batch['agent'][:, :, :2].numpy()       # (B, 4, 2)
    future_gt = batch['future'].numpy()              # (B, 6, 2)
    map_raster = batch['map'].numpy()                # (B, 3, 100, 100)
    
    grid_size = int(np.ceil(np.sqrt(args.n_samples)))
    fig, axes = plt.subplots(grid_size, grid_size, figsize=(4*grid_size, 4*grid_size))
    
    for i in range(args.n_samples):
        if grid_size == 1:
            ax = axes
        elif args.n_samples <= grid_size:
            ax = axes[i]
        else:
            ax = axes[i // grid_size, i % grid_size]
            
        if i >= len(past_xy):
            ax.axis('off')
            continue
            
        # Draw background: walkway channel (0) as grey
        walkway = map_raster[i, 0]
        # map is 100x100. Resolution 0.15 => 15m. Origin in center (50, 50).
        extent = [-7.5, 7.5, -7.5, 7.5]
        ax.imshow(walkway, extent=extent, cmap='gray_r', alpha=0.5, origin='lower')
        
        # Past
        p_xy = past_xy[i]
        ax.plot(p_xy[:, 0], p_xy[:, 1], 'bo-', label='Past', zorder=5)
        
        # Future GT
        gt_xy = future_gt[i]
        gt_full = np.concatenate([p_xy[-1:], gt_xy], axis=0) # connect to last past
        ax.plot(gt_full[:, 0], gt_full[:, 1], 'g--', label='GT', zorder=4)
        
        # Modes
        m_colors = ['r', 'darkorange', 'gold']
        m_labels = ['Mode 1', 'Mode 2', 'Mode 3']
        m_traj = all_traj[i]
        m_prob = mode_probs[i]
        
        for k in range(3):
            traj_k = np.concatenate([p_xy[-1:], m_traj[k]], axis=0)
            alpha_w = float(m_prob[k])
            lw = max(1.0, alpha_w * 4)
            ax.plot(traj_k[:, 0], traj_k[:, 1], color=m_colors[k], linewidth=lw, alpha=max(0.3, alpha_w), label=m_labels[k], zorder=3)
            
        # Intent text
        intent_str = config.INTENT_CLASSES[pred_intents[i]]
        prob_str = f"M1:{m_prob[0]*100:.0f}% M2:{m_prob[1]*100:.0f}% M3:{m_prob[2]*100:.0f}%"
        ax.set_title(f"{intent_str}\n{prob_str}", fontsize=9)
        
        if i == 0:
            ax.legend(fontsize=8, loc='upper left')
            
        ax.set_xlim([-7.5, 7.5])
        ax.set_ylim([-7.5, 7.5])
        
    plt.tight_layout()
    os.makedirs(os.path.join(config.OUTPUT_DIR, 'viz'), exist_ok=True)
    out_path = os.path.join(config.OUTPUT_DIR, 'viz', 'trajectory_predictions.png')
    plt.savefig(out_path, dpi=150)
    print(f"Saved visualization to {out_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkpoint', type=str, required=True)
    parser.add_argument('--n_samples', type=int, default=16)
    args = parser.parse_args()
    
    visualize(args)
