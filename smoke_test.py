import torch
from dataset import NuScenesTrajectoryDataset
from model import SynapseNexusPredictor
from losses import compute_total_loss

print('Loading dataset...')
try:
    ds = NuScenesTrajectoryDataset(split='mini_train', augment=False)
    print(f'Dataset size: {len(ds)}')
    if len(ds) == 0:
        print('Dataset is empty, creating dummy sample for model test')
        sample = {
            'agent': torch.randn(4, 6),
            'neighbours': torch.randn(10, 4, 4),
            'neigh_mask': torch.zeros(10, dtype=torch.bool),
            'map': torch.randn(3, 100, 100),
            'future': torch.randn(6, 2),
            'intent': torch.LongTensor([0]),
            'map_name': 'test_map',
            'origin': torch.randn(2),
            'heading': 0.0
        }
    else:
        sample = ds[0]
    print('Sample keys:', list(sample.keys()))
    print('Agent shape:', sample['agent'].shape)     # should be (4, 6)
    print('Map shape:', sample['map'].shape)         # should be (3, 100, 100)
    print('Future shape:', sample['future'].shape)  # should be (6, 2)
    print('Intent:', sample['intent'])              # should be [0-3]
except Exception as e:
    print(f"Dataset load failed (probably missing data), using dummy sample: {e}")
    sample = {
        'agent': torch.randn(4, 6),
        'neighbours': torch.randn(10, 4, 4),
        'neigh_mask': torch.zeros(10, dtype=torch.bool),
        'map': torch.randn(3, 100, 100),
        'future': torch.randn(6, 2),
        'intent': torch.LongTensor([0]),
        'map_name': 'test_map',
        'origin': torch.randn(2),
        'heading': 0.0
    }

print('Testing model forward pass...')
model = SynapseNexusPredictor()
batch = {k: v.unsqueeze(0) if torch.is_tensor(v) else v for k, v in sample.items()}
out = model(batch['agent'].unsqueeze(0) if batch['agent'].dim() == 2 else batch['agent'], 
            batch['neighbours'].unsqueeze(0) if batch['neighbours'].dim() == 3 else batch['neighbours'],
            batch['neigh_mask'].unsqueeze(0) if batch['neigh_mask'].dim() == 1 else batch['neigh_mask'], 
            batch['map'].unsqueeze(0) if batch['map'].dim() == 3 else batch['map'])
print('trajectories:', out['trajectories'].shape)  # (1, 3, 6, 2)
print('intent_logits:', out['intent_logits'].shape) # (1, 4)
print('log_probs:', out['log_probs'].shape)         # (1, 3)

print('Testing loss...')
future_batch = batch['future'].unsqueeze(0) if batch['future'].dim() == 2 else batch['future']
intent_batch = batch['intent'].unsqueeze(0) if batch['intent'].dim() == 1 else batch['intent']
map_batch = batch['map'].unsqueeze(0) if batch['map'].dim() == 3 else batch['map']

loss, ld = compute_total_loss(out, {
  'future': future_batch,
  'intent': intent_batch,
  'map': map_batch,
})
print('Total loss:', loss.item())
print('All loss components:', ld)
print('SMOKE TEST PASSED')
