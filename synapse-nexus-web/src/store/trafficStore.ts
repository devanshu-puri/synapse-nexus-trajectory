import { create } from 'zustand'
import type { Vehicle, EgoVehicle, TrafficAlert } from '@/types/vehicle'
import { ROAD_NETWORK, getPointAlongRoad } from '@/data/roadNetwork'

export type TrafficDensity = 'light' | 'moderate' | 'heavy'

interface TrafficState {
  egoVehicle: EgoVehicle
  vehicles: Vehicle[]
  alerts: TrafficAlert[]
  activeAlertCount: number
  trafficDensity: TrafficDensity
  averageTrafficSpeed: number
  simulationTime: number
  isPaused: boolean

  // Actions
  setEgoVehicle: (partial: Partial<EgoVehicle>) => void
  setVehicles: (vehicles: Vehicle[]) => void
  addAlert: (alert: TrafficAlert) => void
  dismissAlert: (id: string) => void
  clearAlerts: () => void
  setTrafficDensity: (density: TrafficDensity) => void
  togglePause: () => void
  tick: () => void
}

// Initial ego position on North Expressway (eastbound)
// Road IDs updated to match the rebuilt roadNetwork.ts
const startRoad = ROAD_NETWORK.find(r => r.id === 'hwy-east') ?? ROAD_NETWORK[0]
const initPos = getPointAlongRoad(startRoad, 0.15)

const INITIAL_EGO: EgoVehicle = {
  lng: initPos.lng,
  lat: initPos.lat,
  heading: initPos.heading,
  speed: 50,
  acceleration: 0,
  roadId: 'hwy-east',
  roadProgress: 0.15,
  lane: 1,
  targetSpeed: 55,
  // Planned route uses new IDs: highway → marina boulevard → republic boulevard
  plannedRoute: ['hwy-east', 'marina-blvd-n', 'republic-east', 'bayfront-east', 'hwy-east'],
  routeProgress: 0,
  destination: [103.8641, 1.2895],
}

export const useTrafficStore = create<TrafficState>((set, get) => ({
  egoVehicle: INITIAL_EGO,
  vehicles: [],
  alerts: [],
  activeAlertCount: 0,
  trafficDensity: 'moderate',
  averageTrafficSpeed: 45,
  simulationTime: 0,
  isPaused: false,

  setEgoVehicle: (partial) =>
    set((s) => ({ egoVehicle: { ...s.egoVehicle, ...partial } })),

  setVehicles: (vehicles) => {
    const active = vehicles.filter(v => v.threatLevel !== 'none').length
    const avgSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0) / (vehicles.length || 1)
    set({ vehicles, activeAlertCount: active, averageTrafficSpeed: Math.round(avgSpeed) })
  },

  addAlert: (alert) =>
    set((s) => ({
      alerts: [alert, ...s.alerts].slice(0, 20),
    })),

  dismissAlert: (id) =>
    set((s) => ({ alerts: s.alerts.filter(a => a.id !== id) })),

  clearAlerts: () => set({ alerts: [] }),

  setTrafficDensity: (density) => set({ trafficDensity: density }),

  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  tick: () => set((s) => ({ simulationTime: s.simulationTime + 1 })),
}))
