export type VehicleType = 'car' | 'truck' | 'motorcycle' | 'bus' | 'emergency'

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

export type DriverBehavior =
  | 'normal'
  | 'aggressive'
  | 'slow'
  | 'wrong_way'
  | 'erratic'
  | 'tailgating'
  | 'speeding'
  | 'braking_hard'

export type RelativePosition =
  | 'ahead_same_lane'
  | 'ahead_left_lane'
  | 'ahead_right_lane'
  | 'behind_same_lane'
  | 'behind_left_lane'
  | 'behind_right_lane'
  | 'beside_left'
  | 'beside_right'
  | 'approaching_head_on'
  | 'oncoming'
  | 'crossing'
  | 'merging'

export interface Vehicle {
  id: string
  type: VehicleType
  roadId: string
  roadProgress: number
  lane: number
  lng: number
  lat: number
  heading: number
  speed: number
  acceleration: number
  targetSpeed: number
  behavior: DriverBehavior
  isWrongWay: boolean
  relativeToEgo: RelativePosition
  threatLevel: ThreatLevel
  ttc: number
  distance: number
  closingSpeed: number
  color: string
  size: { width: number; length: number }
  positionHistory: Array<{ lng: number; lat: number }>
  predictedPath: Array<{ lng: number; lat: number }>
}

export interface EgoVehicle {
  lng: number
  lat: number
  heading: number
  speed: number
  acceleration: number
  roadId: string
  roadProgress: number
  lane: number
  targetSpeed: number
  plannedRoute: string[]
  routeProgress: number
  destination: [number, number] | null
}

export interface TrafficAlert {
  id: string
  type:
    | 'wrong_way_driver'
    | 'approaching_fast'
    | 'hard_braking_ahead'
    | 'collision_warning'
    | 'tailgater'
    | 'erratic_driver'
    | 'emergency_vehicle'
    | 'pedestrian_crossing'
    | 'merging_vehicle'
    | 'vehicle_cutting_in'
  severity: 'info' | 'warning' | 'danger' | 'critical'
  vehicleId: string
  message: string
  timestamp: number
  ttc?: number
  distance?: number
  action: string
}

export const VEHICLE_COLORS: Record<VehicleType, string> = {
  car: '#4A9EFF',
  truck: '#F5A623',
  motorcycle: '#00FF88',
  bus: '#9B59B6',
  emergency: '#FF3B3B',
}

export const VEHICLE_SIZES: Record<VehicleType, { width: number; length: number }> = {
  car: { width: 1.8, length: 4.5 },
  truck: { width: 2.5, length: 12.0 },
  motorcycle: { width: 0.8, length: 2.2 },
  bus: { width: 2.5, length: 12.0 },
  emergency: { width: 2.0, length: 5.5 },
}

export const VEHICLE_SPEED_MODIFIERS: Record<VehicleType, number> = {
  car: 1.0,
  truck: 0.8,
  motorcycle: 1.2,
  bus: 0.7,
  emergency: 1.5,
}

export const THREAT_COLORS: Record<ThreatLevel, string> = {
  critical: '#FF0000',
  high: '#FF3B3B',
  medium: '#F5A623',
  low: '#4A9EFF',
  none: '#00FF88',
}
