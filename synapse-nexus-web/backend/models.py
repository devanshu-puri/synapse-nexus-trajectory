from pydantic import BaseModel, EmailStr
from typing import List, Optional

# ─── Auth Models ──────────────────────────────────────────────────────────────

class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # 'driver' or 'engineer'

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# ─── API Data Models ──────────────────────────────────────────────────────────

class TrainingEpoch(BaseModel):
    epoch: int
    train_loss: float
    minADE_3: float
    minFDE_3: float
    MissRate_2_3: float
    OffRoadRate: float

class ModelInfo(BaseModel):
    name: str
    parameters: int
    architecture: str
    history_steps: int
    future_steps: int
    num_modes: int
    hidden_dim: int
    novel_components: List[str]
    export_format: str
    inference_ms: int

class PredictionOutput(BaseModel):
    trajectories: List[List[List[float]]]
    intent: int
    intent_label: str
    mode_probs: List[float]
    inference_ms: int
