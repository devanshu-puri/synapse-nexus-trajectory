import torch
import torch.nn.functional as F
import config

def wta_ade_fde_loss(trajectories, future_gt, visibility=None):
    B, K, T, _ = trajectories.shape
    gt = future_gt.unsqueeze(1).expand(-1, K, -1, -1)
    
    fde_per_mode = torch.norm(
        trajectories[:, :, -1, :] - future_gt[:, -1:, :].expand(-1, K, -1),
        dim=-1
    )
    
    winner = fde_per_mode.argmin(dim=-1).detach()
    winner_idx = winner.view(B, 1, 1, 1).expand(-1, 1, T, 2)
    winner_traj = trajectories.gather(1, winner_idx).squeeze(1)
    
    ade = torch.norm(winner_traj - future_gt, dim=-1).mean(dim=-1)
    fde = torch.norm(winner_traj[:, -1, :] - future_gt[:, -1, :], dim=-1)
    
    loss = ade + fde
    
    if visibility is not None:
        loss = loss * visibility
        
    return loss.mean()

def goal_loss(goals, future_gt):
    gt_goal = future_gt[:, -1, :]
    gt_exp  = gt_goal.unsqueeze(1)
    
    dists = torch.norm(goals - gt_exp, dim=-1)
    min_dist = dists.min(dim=-1).values
    return min_dist.mean()

def intent_loss(intent_logits, intent_labels):
    return F.cross_entropy(intent_logits, intent_labels)

def smoothness_loss(trajectories):
    vel = trajectories[:, :, 1:, :] - trajectories[:, :, :-1, :]
    acc = vel[:, :, 1:, :] - vel[:, :, :-1, :]
    return torch.norm(acc, dim=-1).mean()

def map_compliance_loss(trajectories, map_raster):
    B, K, T, _ = trajectories.shape
    H, W = config.MAP_SIZE_PX, config.MAP_SIZE_PX
    
    # x is forward, y is left in agent frame. In image: x is W, y is H
    pixel_x = (trajectories[..., 0] / config.MAP_RESOLUTION) + W / 2
    pixel_y = -(trajectories[..., 1] / config.MAP_RESOLUTION) + H / 2
    
    # grid sample expects [-1, 1], where (-1, -1) is top-left, (1, 1) is bottom-right
    grid_x = (pixel_x / (W / 2)) - 1
    grid_y = (pixel_y / (H / 2)) - 1
    
    grid = torch.stack([grid_x, grid_y], dim=-1) # (B, K, T, 2)
    
    walkway_map = map_raster[:, 0:1, :, :]
    crossing_map = map_raster[:, 1:2, :, :]
    walkable = (walkway_map + crossing_map).clamp(0, 1) # (B, 1, H, W)
    
    sampled = F.grid_sample(walkable, grid.view(B, K*T, 1, 2), mode='bilinear', padding_mode='zeros', align_corners=False)
    sampled = sampled.squeeze(1).squeeze(-1).view(B, K, T)
    
    non_walkable = 1.0 - sampled.clamp(0, 1)
    return non_walkable.mean()

def mode_nll_loss(log_probs, trajectories, future_gt):
    fde_per_mode = torch.norm(trajectories[:, :, -1, :] - future_gt[:, -1:, :].expand(-1, config.NUM_MODES, -1), dim=-1)
    soft_labels = F.softmax(-fde_per_mode, dim=-1).detach()
    loss = -(soft_labels * log_probs).sum(dim=-1).mean()
    return loss

def compute_total_loss(outputs, batch):
    trajectories  = outputs['trajectories']
    goals         = outputs['goals']
    intent_logits = outputs['intent_logits']
    log_probs     = outputs['log_probs']
    
    future_gt     = batch['future']
    intent_gt     = batch['intent'].squeeze(-1)
    map_raster    = batch['map']
    visibility    = batch.get('visibility', None)
    
    l_ade_fde = wta_ade_fde_loss(trajectories, future_gt, visibility)
    l_goal    = goal_loss(goals, future_gt)
    l_intent  = intent_loss(intent_logits, intent_gt)
    l_smooth  = smoothness_loss(trajectories)
    l_map     = map_compliance_loss(trajectories, map_raster)
    l_mode    = mode_nll_loss(log_probs, trajectories, future_gt)
    
    total = (config.LAMBDA_ADE   * l_ade_fde +
             config.LAMBDA_GOAL  * l_goal    +
             config.LAMBDA_INTENT * l_intent +
             config.LAMBDA_SMOOTH * l_smooth +
             config.LAMBDA_MAP   * l_map     +
             config.LAMBDA_MODE  * l_mode)
             
    return total, {
        'ade_fde': l_ade_fde.item(),
        'goal':    l_goal.item(),
        'intent':  l_intent.item(),
        'smooth':  l_smooth.item(),
        'map':     l_map.item(),
        'mode':    l_mode.item(),
        'total':   total.item()
    }
