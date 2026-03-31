import os
import argparse
import torch
import onnx
import onnxruntime
from model import SynapseNexusPredictor
import config

def export_to_onnx(checkpoint_path, batch_size=1):
    device = torch.device('cpu')
    model = SynapseNexusPredictor().to(device)
    
    ckpt = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(ckpt['model'])
    model.eval()
    
    # Dummy inputs
    agent = torch.randn(batch_size, config.HISTORY_STEPS, 6)
    neighbours = torch.randn(batch_size, config.MAX_NEIGHBOURS, config.HISTORY_STEPS, 4)
    neigh_mask = torch.zeros(batch_size, config.MAX_NEIGHBOURS, dtype=torch.bool)
    map_raster = torch.randn(batch_size, 3, config.MAP_SIZE_PX, config.MAP_SIZE_PX)
    
    dummy_input = (agent, neighbours, neigh_mask, map_raster)
    
    out_path = os.path.join(config.OUTPUT_DIR, 'synapse_nexus.onnx')
    
    print(f"Exporting model to {out_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        out_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=['agent', 'neighbours', 'neigh_mask', 'map'],
        output_names=['trajectories', 'goals', 'intent_logits', 'log_probs'],
        dynamic_axes={
            'agent': {0: 'batch_size'},
            'neighbours': {0: 'batch_size'},
            'neigh_mask': {0: 'batch_size'},
            'map': {0: 'batch_size'},
            'trajectories': {0: 'batch_size'},
            'goals': {0: 'batch_size'},
            'intent_logits': {0: 'batch_size'},
            'log_probs': {0: 'batch_size'}
        }
    )
    
    print("Verifying ONNX model...")
    onnx_model = onnx.load(out_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX graph verification successful!")
    
    print("Testing inference with ONNXRuntime...")
    ort_session = onnxruntime.InferenceSession(out_path)
    
    ort_inputs = {
        'agent': agent.numpy(),
        'neighbours': neighbours.numpy(),
        'neigh_mask': neigh_mask.numpy(),
        'map': map_raster.numpy(),
    }
    
    ort_outs = ort_session.run(None, ort_inputs)
    print(f"Traj output shape: {ort_outs[0].shape}")
    print(f"Goals output shape: {ort_outs[1].shape}")
    print("ONNX export and verification complete.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkpoint', type=str, required=True)
    args = parser.parse_args()
    
    export_to_onnx(args.checkpoint)
