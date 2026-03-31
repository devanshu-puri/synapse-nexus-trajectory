// ─── Driving Simulation Type Definitions ──────────────────────────────────────

export type RiskState = 'safe' | 'warning' | 'danger'
export type VehicleKind = 'car' | 'truck' | 'motorcycle' | 'pedestrian'

export interface WorldPos {
  x: number
  y: number
}

export interface SimVehicle {
  id: string
  label: string
  kind: VehicleKind
  x: number
  y: number
  heading: number       // radians; 0=up(−y), π/2=right(+x)
  risk: RiskState
  visible: boolean
  trail: WorldPos[]
  traj1: WorldPos[]     // primary trajectory (solid)
  traj2: WorldPos[]     // alternate (dashed, lower opacity)
  traj3: WorldPos[]     // third option (very faint)
  braking: boolean      // show brake lights
  isWrongWay: boolean
  showV2N: boolean      // V2N network broadcast icon
}

export interface EgoState {
  x: number
  y: number
  heading: number
  displaySpeed: number  // km/h (smoothly lerped)
  targetSpeed: number   // km/h target
  braking: boolean
  odometer: number      // total km traveled
  trip: number          // km since start
}

export interface ActiveAlert {
  id: string
  severity: 'warning' | 'danger'
  title: string
  detail: string
  ttc: number | null    // Time-to-collision seconds, null if N/A
  createdAt: number     // performance.now()
}

export interface AlertHistoryEntry {
  id: string
  title: string
  detail: string
  timestamp: number     // Date.now()
  status: 'active' | 'resolved'
  severity: 'warning' | 'danger' | 'info'
}

export interface SystemStats {
  agentCount: number
  intentAccuracy: number
  scenarioIndex: number     // 1–4
  scenarioName: string
  scenarioProgress: number  // 0–1
  scenarioTimeRemaining: number // seconds
}

export interface ScenarioState {
  vehicles: SimVehicle[]
  ego: EgoState
  activeAlert: ActiveAlert | null
  alertHistory: AlertHistoryEntry[]
  lunaMessage: string
  stats: SystemStats
  dangerMode: boolean
  screenFlash: boolean
  showIntroCard: boolean
  introCardData: {
    title: string
    description: string
    scenarioNumber: number
  } | null
}
