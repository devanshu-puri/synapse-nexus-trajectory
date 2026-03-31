import traceback
from dataset import NuScenesTrajectoryDataset

with open('trace.txt', 'w', encoding='utf-8') as f:
    try:
        f.write('Loading dataset...\n')
        d = NuScenesTrajectoryDataset(split='mini_train')
        f.write(f'Dataset loaded, len: {len(d)}\n')
        out = d[0]
        f.write('Got sample 0 successfully!\n')
    except Exception as e:
        f.write('FAILED!\n')
        traceback.print_exc(file=f)
