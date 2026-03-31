import os
import json
import time
import argparse
import math
import torch
import torch.optim as optim
from torch.cuda.amp import GradScaler, autocast
import numpy as np

from dataset import get_dataloaders
from model import SynapseNexusPredictor
from losses import compute_total_loss
from evaluate import evaluate_model
import config

def get_lr_scheduler(optimizer, total_steps, warmup_steps):
    def lr_lambda(step):
        if step < warmup_steps:
            return step / warmup_steps
        progress = (step - warmup_steps) / (total_steps - warmup_steps)
        return 0.5 * (1 + math.cos(math.pi * progress))
    return torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)

def train_one_epoch(model, loader, optimizer, scheduler, scaler, device, epoch):
    model.train()
    total_loss = 0.0
    loss_components = {}
    
    for batch_idx, batch in enumerate(loader):
        batch = {k: v.to(device) if torch.is_tensor(v) else v for k, v in batch.items()}
        
        optimizer.zero_grad()
        
        with autocast(enabled=config.AMP_ENABLED and device.type == 'cuda'):
            outputs = model(
                batch['agent'],
                batch['neighbours'],
                batch['neigh_mask'],
                batch['map']
            )
            loss, loss_dict = compute_total_loss(outputs, batch)
            
        scaler.scale(loss).backward()
        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), config.GRAD_CLIP)
        scaler.step(optimizer)
        scaler.update()
        scheduler.step()
        
        total_loss += loss.item()
        for k, v in loss_dict.items():
            loss_components[k] = loss_components.get(k, 0) + v
            

        if batch_idx % 1 == 0:
            print(f"  Epoch {epoch} | Batch {batch_idx}/{len(loader)} | "
                  f"Loss: {loss.item():.4f} | "
                  f"Map: {loss_dict['map']:.4f} | "
                  f"Intent: {loss_dict['intent']:.4f}")
                  
    n = len(loader)
    return total_loss / n, {k: v/n for k, v in loss_components.items()}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs',     type=int, default=config.EPOCHS)
    parser.add_argument('--batch_size', type=int, default=config.BATCH_SIZE)
    parser.add_argument('--resume',     type=str, default=None, help='path to checkpoint')
    parser.add_argument('--fresh',      action='store_true', help='ignore existing checkpoints')
    args = parser.parse_args()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on: {device}")
    
    os.makedirs(config.CHECKPOINT_DIR, exist_ok=True)
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    
    train_loader, val_loader = get_dataloaders(args.batch_size)
    
    model = SynapseNexusPredictor().to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Model parameters: {total_params:,}")
    
    optimizer = optim.AdamW(model.parameters(), lr=config.LR, weight_decay=config.WEIGHT_DECAY)
    
    total_steps  = args.epochs * len(train_loader)
    warmup_steps = config.WARMUP_EPOCHS * len(train_loader)
    scheduler    = get_lr_scheduler(optimizer, total_steps, warmup_steps)
    
    scaler = GradScaler(enabled=config.AMP_ENABLED and device.type == 'cuda')
    
    start_epoch = 0
    best_fde    = float('inf')
    history     = []
    
    ckpt_path = os.path.join(config.CHECKPOINT_DIR, 'best.pt')
    if not args.fresh and os.path.exists(ckpt_path) and not args.resume:
        args.resume = ckpt_path
        
    if args.resume and os.path.exists(args.resume):
        ckpt = torch.load(args.resume, map_location=device)
        model.load_state_dict(ckpt['model'])
        optimizer.load_state_dict(ckpt['optimizer'])
        start_epoch = ckpt['epoch'] + 1
        best_fde    = ckpt.get('best_fde', float('inf'))
        history     = ckpt.get('history', [])
        print(f"Resumed from epoch {start_epoch}, best FDE: {best_fde:.4f}")
        
    for epoch in range(start_epoch, args.epochs):
        t0 = time.time()
        
        train_loss, train_components = train_one_epoch(
            model, train_loader, optimizer, scheduler, scaler, device, epoch
        )
        
        if epoch % 5 == 0 or epoch == args.epochs - 1:
            val_metrics = evaluate_model(model, val_loader, device)
            
            print(f"\n{'='*60}")
            print(f"Epoch {epoch}/{args.epochs} | Time: {time.time()-t0:.1f}s")
            print(f"Train Loss: {train_loss:.4f}")
            print(f"Val minADE_3:  {val_metrics['minADE_3']:.4f}")
            print(f"Val minFDE_3:  {val_metrics['minFDE_3']:.4f}")
            print(f"Val MissRate:  {val_metrics['MissRate_2_3']:.4f}")
            print(f"Val OffRoadRate: {val_metrics['OffRoadRate']:.4f}")
            print(f"{'='*60}\n")
            
            record = {
                'epoch': epoch,
                'train_loss': train_loss,
                **train_components,
                **val_metrics
            }
            history.append(record)
            
            with open(os.path.join(config.OUTPUT_DIR, 'training_history.json'), 'w') as f:
                json.dump(history, f, indent=2)
                
            if val_metrics['minFDE_3'] < best_fde:
                best_fde = val_metrics['minFDE_3']
                torch.save({
                    'epoch':     epoch,
                    'model':     model.state_dict(),
                    'optimizer': optimizer.state_dict(),
                    'best_fde':  best_fde,
                    'history':   history,
                    'val_metrics': val_metrics,
                    'config': {
                        'HISTORY_STEPS': config.HISTORY_STEPS,
                        'FUTURE_STEPS':  config.FUTURE_STEPS,
                        'NUM_MODES':     config.NUM_MODES,
                        'HIDDEN_DIM':    config.HIDDEN_DIM,
                    }
                }, ckpt_path)
                print(f"  ✓ New best checkpoint saved (FDE: {best_fde:.4f})")
                
        if epoch % 10 == 0:
            torch.save({
                'epoch': epoch, 'model': model.state_dict(),
                'optimizer': optimizer.state_dict(), 'best_fde': best_fde
            }, os.path.join(config.CHECKPOINT_DIR, f'epoch_{epoch:03d}.pt'))
            
    print(f"\nTraining complete. Best minFDE_3: {best_fde:.4f}")
    print(f"Checkpoints saved to: {config.CHECKPOINT_DIR}")

if __name__ == '__main__':
    main()
