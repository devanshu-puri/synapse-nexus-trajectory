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
  heading: number
  risk: RiskState
  visible: boolean
  trail: WorldPos[]
  traj1: WorldPos[]
  traj2: WorldPos[]
  traj3: WorldPos[]
  braking: boolean
  isWrongWay: boolean
  showV2N: boolean
}

export interface EgoState {
  x: number
  y: number
  heading: number
  displaySpeed: number
  targetSpeed: number
  braking: boolean
  odometer: number
  trip: number
}

export interface ActiveAlert {
  id: string
  severity: 'warning' | 'danger'
  title: string
  detail: string
  ttc: number | null
  createdAt: number
}

export interface AlertHistoryEntry {
  id: string
  title: string
  detail: string
  timestamp: number
  status: 'active' | 'resolved'
  severity: 'warning' | 'danger' | 'info'
}

export interface SystemStats {
  agentCount: number
  intentAccuracy: number
  scenarioIndex: number
  scenarioName: string
  scenarioProgress: number
  scenarioTimeRemaining: number
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
