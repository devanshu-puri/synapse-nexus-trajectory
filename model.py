import torch
import torch.nn as nn
import torch.nn.functional as F
import config

class AgentEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.gru = nn.GRU(input_size=6, hidden_size=config.HIDDEN_DIM, num_layers=2, batch_first=True, dropout=0.1)
        
    def forward(self, x):
        # x: (B, 4, 6)
        out, _ = self.gru(x)
        return out[:, -1, :]

class NeighbourEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.gru = nn.GRU(input_size=4, hidden_size=config.HIDDEN_DIM, num_layers=1, batch_first=True)
        
    def forward(self, x):
        # x: (B, MAX_NEIGHBOURS, HISTORY_STEPS, 4)
        B, N, T, F = x.shape
        if N == 0:
             return torch.zeros((B, 0, config.HIDDEN_DIM), device=x.device)
        x = x.view(B * N, T, F)
        out, _ = self.gru(x)
        out = out[:, -1, :] # (B * N, HIDDEN_DIM)
        return out.view(B, N, config.HIDDEN_DIM)

class SocialAttention(nn.Module):
    def __init__(self):
        super().__init__()
        self.attn = nn.MultiheadAttention(embed_dim=config.HIDDEN_DIM, num_heads=config.ATTN_HEADS, dropout=0.1, batch_first=True)
        self.norm = nn.LayerNorm(config.HIDDEN_DIM)
        
    def forward(self, ego_token, neigh_tokens, neigh_mask):
        Q = ego_token.unsqueeze(1) # (B, 1, HIDDEN_DIM)
        K = neigh_tokens
        V = neigh_tokens
        mask = ~neigh_mask
        
        B, MAX_N = mask.shape
        all_masked = mask.all(dim=1)
        
        safe_mask = mask.clone()
        new_col_0 = torch.logical_and(~all_masked, mask[:, 0])
        safe_mask = torch.cat([new_col_0.unsqueeze(1), mask[:, 1:]], dim=1)
        
        attn_output, attn_weights = self.attn(Q, K, V, key_padding_mask=safe_mask)
        attn_output = attn_output.squeeze(1)
        
        attn_output = attn_output * (~all_masked).unsqueeze(1).float()
        
        social_context = ego_token + attn_output
        return self.norm(social_context), attn_weights

class MapEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.GELU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.GELU(),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.GELU(),
            nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(256),
            nn.GELU(),
            nn.Conv2d(256, config.CNN_OUT_DIM, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(config.CNN_OUT_DIM),
            nn.GELU(),
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten()
        )
        self.proj = nn.Sequential(
            nn.Linear(config.CNN_OUT_DIM, config.HIDDEN_DIM),
            nn.LayerNorm(config.HIDDEN_DIM),
            nn.GELU()
        )
        
    def forward(self, x):
        feat = self.cnn(x)
        return self.proj(feat)

class ContextFusion(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(config.HIDDEN_DIM * 2, config.HIDDEN_DIM * 2),
            nn.GELU(),
            nn.Linear(config.HIDDEN_DIM * 2, config.HIDDEN_DIM),
            nn.LayerNorm(config.HIDDEN_DIM)
        )
        
    def forward(self, social_ctx, map_ctx):
        x = torch.cat([social_ctx, map_ctx], dim=-1)
        out = self.net(x)
        return out + (social_ctx + map_ctx) / 2

class IntentClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(config.HIDDEN_DIM, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(128, config.NUM_INTENTS)
        )
        self.embed = nn.Embedding(config.NUM_INTENTS, 32)
        
    def forward(self, context):
        logits = self.net(context)
        intent_idx = logits.argmax(dim=-1)
        intent_emb = self.embed(intent_idx)
        return logits, intent_emb

class GoalPredictor(nn.Module):
    def __init__(self):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(config.HIDDEN_DIM + 32, 256),
            nn.GELU(),
            nn.Linear(256, 256),
            nn.GELU()
        )
        self.heads = nn.ModuleList([nn.Linear(256, 2) for _ in range(config.NUM_MODES)])
        
    def forward(self, context, intent_emb):
        x = torch.cat([context, intent_emb], dim=-1) # (B, HIDDEN_DIM+32)
        feat = self.shared(x)
        goals = [head(feat) for head in self.heads]
        return torch.stack(goals, dim=1) # (B, K, 2)

class TrajectoryDecoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.h0_proj = nn.Linear(config.HIDDEN_DIM + 2 + 32, config.GRU_HIDDEN)
        self.gru_cell = nn.GRUCell(input_size=2, hidden_size=config.GRU_HIDDEN)
        self.output_proj = nn.Linear(config.GRU_HIDDEN, 2)
        
    def forward(self, context, goals, intent_emb):
        B = context.size(0)
        K = config.NUM_MODES
        T = config.FUTURE_STEPS
        
        trajectories = []
        for k in range(K):
            goal_k = goals[:, k, :]
            init_input = torch.cat([context, goal_k, intent_emb], dim=-1)
            h = self.h0_proj(init_input)
            
            prev_pos = torch.zeros((B, 2), device=context.device)
            preds = []
            
            for t in range(T):
                h = self.gru_cell(prev_pos, h)
                delta = self.output_proj(h)
                pos = prev_pos + delta
                preds.append(pos)
                prev_pos = pos
                
            final_pred = preds[-1]
            correction = (goal_k - final_pred)
            
            for i in range(T):
                preds[i] = preds[i] + correction * ((i + 1) / T)
                
            trajectories.append(torch.stack(preds, dim=1))
            
        return torch.stack(trajectories, dim=1)

class OccupancyScorer(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(12 + config.HIDDEN_DIM, 128),
            nn.GELU(),
            nn.Linear(128, 1)
        )
        
    def forward(self, trajectories, map_features):
        B, K, T, _ = trajectories.shape
        scores = []
        for k in range(K):
            traj_k = trajectories[:, k, :, :].reshape(B, 12)
            x = torch.cat([traj_k, map_features], dim=-1)
            scores.append(self.net(x))
        return torch.cat(scores, dim=-1) # (B, K)

class ModeClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Linear(config.HIDDEN_DIM, config.NUM_MODES)
        
    def forward(self, context, plausibility_scores):
        base_logits = self.net(context)
        final_logits = base_logits + plausibility_scores
        return F.log_softmax(final_logits, dim=-1)

class SynapseNexusPredictor(nn.Module):
    def __init__(self):
        super().__init__()
        self.agent_enc    = AgentEncoder()
        self.neigh_enc    = NeighbourEncoder()
        self.social_attn  = SocialAttention()
        self.map_enc      = MapEncoder()
        self.ctx_fusion   = ContextFusion()
        self.intent_cls   = IntentClassifier()
        self.goal_pred    = GoalPredictor()
        self.traj_dec     = TrajectoryDecoder()
        self.occ_scorer   = OccupancyScorer()
        self.mode_cls     = ModeClassifier()
        
    def forward(self, agent, neighbours, neigh_mask, map_raster):
        ego_tok    = self.agent_enc(agent)
        neigh_toks = self.neigh_enc(neighbours)
        social_ctx, attn_w = self.social_attn(ego_tok, neigh_toks, neigh_mask)
        map_ctx    = self.map_enc(map_raster)
        context    = self.ctx_fusion(social_ctx, map_ctx)
        
        intent_logits, intent_emb = self.intent_cls(context)
        goals = self.goal_pred(context, intent_emb)
        trajectories = self.traj_dec(context, goals, intent_emb)
        plaus_scores = self.occ_scorer(trajectories, map_ctx)
        log_probs = self.mode_cls(context, plaus_scores)
        
        return {
            'trajectories':   trajectories,
            'goals':          goals,
            'intent_logits':  intent_logits,
            'log_probs':      log_probs,
            'attn_weights':   attn_w
        }
        
    def predict(self, agent, neighbours, neigh_mask, map_raster):
        self.eval()
        with torch.no_grad():
            out = self.forward(agent, neighbours, neigh_mask, map_raster)
            best_mode = out['log_probs'].argmax(dim=-1)
            best_traj = out['trajectories'][torch.arange(len(best_mode)), best_mode]
            intent_idx = out['intent_logits'].argmax(dim=-1)
            probs = out['log_probs'].exp()
            
        return {
            'best_trajectory': best_traj,
            'all_trajectories': out['trajectories'],
            'intent': intent_idx,
            'mode_probs': probs,
            'attn_weights': out['attn_weights']
        }
