"""
Synapse Nexus AI — Master Configuration
All hyperparameters in one place. Change DATASET_VERSION 
to 'v1.0-trainval' if full dataset is available.
"""
import os

# PATHS
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
DATAROOT        = os.path.join(BASE_DIR, "data", "nuscenes", "v1.0-mini")
DATASET_VERSION = "v1.0-mini"
CHECKPOINT_DIR  = os.path.join(BASE_DIR, "checkpoints")
OUTPUT_DIR      = os.path.join(BASE_DIR, "outputs")

# TEMPORAL (problem statement: 2s in, 3s out at 2Hz)
FREQ_HZ         = 2
HISTORY_STEPS   = 4    # 2 seconds × 2Hz
FUTURE_STEPS    = 6    # 3 seconds × 2Hz
NUM_MODES       = 3    # K = 3 multi-modal predictions

# FEATURES
AGENT_FEATURES     = 6   # x, y, vx, vy, sin(heading), cos(heading)
NEIGHBOUR_FEATURES = 4   # relative: dx, dy, dvx, dvy
MAX_NEIGHBOURS     = 10
NEIGHBOUR_RADIUS   = 30.0  # metres

# MAP RASTERIZATION
# Uses the PNG files in maps/ folder via NuScenesMap API
MAP_CHANNELS    = 3       # channel 0: walkway
                          # channel 1: ped_crossing  
                          # channel 2: drivable_area
MAP_SIZE_PX     = 100     # 100 × 100 pixel grid
MAP_RESOLUTION  = 0.15    # metres per pixel = 15m × 15m coverage

# MODEL ARCHITECTURE
HIDDEN_DIM      = 256
ATTN_HEADS      = 4
CNN_OUT_DIM     = 256
GRU_HIDDEN      = 256

# INTENT CLASSIFICATION (our differentiator vs other teams)
# Intent is predicted BEFORE trajectory decoding
# The intent embedding then conditions the GRU decoder
INTENT_CLASSES  = ["continue_straight", "cross_road", 
                   "turn_at_junction", "stop_or_wait"]
NUM_INTENTS     = 4

# TRAINING
BATCH_SIZE      = 64
EPOCHS          = 80
LR              = 3e-4
WEIGHT_DECAY    = 1e-4
WARMUP_EPOCHS   = 5
GRAD_CLIP       = 1.0
AMP_ENABLED     = True  # Automatic Mixed Precision (needs CUDA)

# LOSS WEIGHTS — tuned to fix OffRoadRate=1.0 bug
LAMBDA_ADE      = 1.0
LAMBDA_FDE      = 1.0
LAMBDA_GOAL     = 0.5
LAMBDA_INTENT   = 0.3   # cross-entropy on intent classification
LAMBDA_SMOOTH   = 0.1   # velocity smoothness (reduces jitter)
LAMBDA_MAP      = 0.8   # MAP COMPLIANCE — KEY FIX for OffRoadRate
LAMBDA_MODE     = 0.2   # mode probability NLL

# AUGMENTATION
AUG_ROTATE90    = True
AUG_HFLIP       = True
AUG_NOISE_STD   = 0.02  # gaussian noise in metres on coordinates

# EVALUATION THRESHOLDS
MISS_RATE_DIST  = 2.0   # metres threshold for MissRate
OFFROAD_STEPS   = 5     # number of steps to check for off-road

# AGENT CATEGORIES TO INCLUDE FROM NUSCENES
AGENT_CATEGORIES = [
    "human.pedestrian.adult",
    "human.pedestrian.child",
    "human.pedestrian.construction_worker",
    "human.pedestrian.personal_mobility",
    "human.pedestrian.police_officer",
    "human.pedestrian.stroller",
    "human.pedestrian.wheelchair",
    "vehicle.bicycle",
    "vehicle.motorcycle",
]

# Map category string → intent index
# Logic: infer rough intent from the category type
# This is later refined by motion analysis in dataset.py
CATEGORY_INTENT_PRIOR = {
    "human.pedestrian.adult":                0,  # continue
    "human.pedestrian.child":               1,  # cross_road (unpredictable)
    "human.pedestrian.construction_worker": 3,  # stop/wait
    "human.pedestrian.personal_mobility":   0,
    "human.pedestrian.police_officer":      3,
    "human.pedestrian.stroller":            1,  # cross_road
    "human.pedestrian.wheelchair":          0,
    "vehicle.bicycle":                      0,
    "vehicle.motorcycle":                   2,  # turn_at_junction
}
