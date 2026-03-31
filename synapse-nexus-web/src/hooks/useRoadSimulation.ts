'use client'

import { useEffect, useRef } from 'react'
import { useTrafficStore } from '@/store/trafficStore'
import {
  ROAD_NETWORK,
  getRoadLength,
  getLanePosition,
  getPointAlongRoad,
  haversineM,
  findNearestRoad,
  projectOntoRoad,
} from '@/data/roadNetwork'
import {
  Vehicle,
  VehicleType,
  DriverBehavior,
  ThreatLevel,
  RelativePosition,
  VEHICLE_COLORS,
  VEHICLE_SIZES,
  VEHICLE_SPEED_MODIFIERS,
  TrafficAlert,
} from '@/types/vehicle'

// ─── Constants ────────────────────────────────────────────────────────────────
const SIMULATION_INTERVAL = 100   // ms
const NUM_VEHICLES = 12
const HISTORY_LENGTH = 20
const DT = SIMULATION_INTERVAL / 1000
const SNAP_THRESHOLD = 15         // meters — snap vehicle back if drifted this far
const FOLLOW_DISTANCE = 25        // meters — desired gap between vehicles
const ALERT_COOLDOWN = 3000
const alertCooldowns = new Map<string, number>()

// ─── Normalize angle to [-π, π] ───────────────────────────────────────────────
function normAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

// ─── Pick random road ──────────────────────────────────────────────────────────
function randomRoad() {
  return ROAD_NETWORK[Math.floor(Math.random() * ROAD_NETWORK.length)]
}

// ─── Initialize one traffic vehicle ───────────────────────────────────────────
function initVehicle(id: string, forceWrongWay = false): Vehicle {
  const typePool: VehicleType[] = ['car', 'car', 'car', 'car', 'truck', 'motorcycle', 'bus', 'car']
  const behaviorPool: DriverBehavior[] = ['normal', 'normal', 'normal', 'aggressive', 'slow', 'speeding']
  const type: VehicleType = typePool[Math.floor(Math.random() * typePool.length)]
  const behavior: DriverBehavior = forceWrongWay
    ? 'wrong_way'
    : behaviorPool[Math.floor(Math.random() * behaviorPool.length)]

  const road = randomRoad()
  const progress = 0.1 + Math.random() * 0.8
  const lane = Math.floor(Math.random() * road.lanes)
  const pos = getLanePosition(road, progress, lane)

  const speedMod = VEHICLE_SPEED_MODIFIERS[type]
  const behaviorMod =
    behavior === 'aggressive' || behavior === 'speeding' ? 1.3
    : behavior === 'slow' ? 0.55
    : behavior === 'erratic' ? 0.6 + Math.random() * 0.8
    : 1.0
  const speed = road.speedLimit * speedMod * behaviorMod * (0.9 + Math.random() * 0.2)
  const isWrongWay = forceWrongWay || (road.direction === 'oneway' && Math.random() < 0.04)

  return {
    id,
    type,
    roadId: road.id,
    roadProgress: progress,
    lane,
    lng: pos.lng,
    lat: pos.lat,
    heading: isWrongWay ? pos.heading + Math.PI : pos.heading,
    speed,
    acceleration: 0,
    targetSpeed: speed,
    behavior,
    isWrongWay,
    relativeToEgo: 'ahead_same_lane',
    threatLevel: 'none',
    ttc: Infinity,
    distance: 999,
    closingSpeed: 0,
    color: VEHICLE_COLORS[type],
    size: VEHICLE_SIZES[type],
    positionHistory: [],
    predictedPath: [],
  }
}

// ─── Wrong-way detection ──────────────────────────────────────────────────────
function detectWrongWay(v: Vehicle): boolean {
  const road = ROAD_NETWORK.find(r => r.id === v.roadId)
  if (!road || road.direction === 'twoway') return false
  const coords = road.coordinates
  const roadHeading = Math.atan2(
    coords[coords.length - 1][1] - coords[0][1],
    coords[coords.length - 1][0] - coords[0][0],
  )
  return Math.abs(normAngle(v.heading - roadHeading)) > 0.6 * Math.PI
}

// ─── Relative position in ego reference frame ──────────────────────────────────
function calcRelativePos(
  v: { lng: number; lat: number; heading: number; closingSpeed: number },
  ego: { lng: number; lat: number; heading: number; lane: number },
): RelativePosition {
  const dx = v.lng - ego.lng
  const dy = v.lat - ego.lat
  const cos = Math.cos(-ego.heading)
  const sin = Math.sin(-ego.heading)
  const relX = dx * cos - dy * sin
  const relY = dx * sin + dy * cos
  const hdDiff = Math.abs(normAngle(v.heading - ego.heading))
  if (hdDiff > Math.PI / 2 && v.closingSpeed > 0) return 'approaching_head_on'
  if (hdDiff > Math.PI / 2) return 'oncoming'
  const LT = 0.0002
  const FT = 0.00008
  if (relY > FT) return Math.abs(relX) < LT ? 'ahead_same_lane' : relX < 0 ? 'ahead_left_lane' : 'ahead_right_lane'
  if (relY < -FT) return Math.abs(relX) < LT ? 'behind_same_lane' : relX < 0 ? 'behind_left_lane' : 'behind_right_lane'
  return relX < 0 ? 'beside_left' : 'beside_right'
}

// ─── Threat level ─────────────────────────────────────────────────────────────
function calcThreat(v: Vehicle): ThreatLevel {
  if (v.isWrongWay && v.relativeToEgo === 'approaching_head_on') return 'critical'
  if (v.ttc > 0 && v.ttc < 2) return 'critical'
  if (v.ttc > 0 && v.ttc < 4) return 'high'
  if (v.closingSpeed > 50 && v.distance < 30) return 'high'
  if (v.behavior === 'erratic' && v.distance < 50) return 'high'
  if (v.ttc > 0 && v.ttc < 8) return 'medium'
  if (v.behavior === 'aggressive' && v.distance < 40) return 'medium'
  if (v.behavior === 'tailgating' && v.distance < 15) return 'medium'
  if (v.closingSpeed > 20 && v.distance < 80) return 'low'
  if (v.speed > 80 && v.distance < 100) return 'low'
  return 'none'
}

// ─── Alert generation ─────────────────────────────────────────────────────────
function maybeAlert(v: Vehicle): TrafficAlert | null {
  const now = Date.now()
  if ((now - (alertCooldowns.get(v.id) ?? 0)) < ALERT_COOLDOWN) return null
  alertCooldowns.set(v.id, now)
  const spd = `${Math.round(v.speed)} km/h`
  const ttcStr = isFinite(v.ttc) ? `${v.ttc.toFixed(1)}s` : '—'
  const dStr = `${Math.round(v.distance)}m`
  if (v.isWrongWay && v.relativeToEgo === 'approaching_head_on')
    return { id: `${v.id}-${now}`, type: 'wrong_way_driver', severity: 'critical', vehicleId: v.id, message: `⚠️ WRONG WAY ${v.type.toUpperCase()}! Head-on at ${spd}`, timestamp: now, ttc: v.ttc, distance: v.distance, action: 'BRAKE IMMEDIATELY — Move to shoulder' }
  if (v.ttc > 0 && v.ttc < 2)
    return { id: `${v.id}-${now}`, type: 'collision_warning', severity: 'critical', vehicleId: v.id, message: `🚨 COLLISION WARNING! TTC ${ttcStr}`, timestamp: now, ttc: v.ttc, distance: v.distance, action: 'Emergency braking required' }
  if (v.ttc > 0 && v.ttc < 4)
    return { id: `${v.id}-${now}`, type: 'approaching_fast', severity: 'danger', vehicleId: v.id, message: `Fast ${v.type} at ${spd} (+${Math.round(v.closingSpeed)} km/h)`, timestamp: now, ttc: v.ttc, distance: v.distance, action: 'Maintain lane, prepare to brake' }
  if (v.behavior === 'erratic' && v.distance < 50)
    return { id: `${v.id}-${now}`, type: 'erratic_driver', severity: 'warning', vehicleId: v.id, message: `Erratic ${v.type} (${dStr})`, timestamp: now, distance: v.distance, action: 'Increase following distance' }
  if (v.type === 'emergency')
    return { id: `${v.id}-${now}`, type: 'emergency_vehicle', severity: 'info', vehicleId: v.id, message: `Emergency vehicle ${dStr} away`, timestamp: now, distance: v.distance, action: 'Yield right of way' }
  return null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useRoadSimulation() {
  const { egoVehicle, isPaused, setEgoVehicle, setVehicles, addAlert, tick } =
    useTrafficStore()

  const vehiclesRef = useRef<Vehicle[]>([])
  const egoRef = useRef(egoVehicle)
  egoRef.current = egoVehicle

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (vehiclesRef.current.length > 0) return
    const vs: Vehicle[] = []
    for (let i = 0; i < NUM_VEHICLES; i++) {
      vs.push(initVehicle(`v-${i}`, i === 0))
    }
    vehiclesRef.current = vs
    setVehicles(vs)
  }, [setVehicles])

  // ── Main loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return
      const ego = egoRef.current

      // ── Move ego along planned route ────────────────────────────────────────
      const egoRoad = ROAD_NETWORK.find(r => r.id === ego.roadId)
      if (egoRoad) {
        const roadLen = getRoadLength(egoRoad)
        const delta = (ego.speed / 3.6) * DT / roadLen
        let newProg = ego.roadProgress + delta
        let newRoadId = ego.roadId

        if (newProg >= 1) {
          const ri = ego.plannedRoute.indexOf(ego.roadId)
          newRoadId = ego.plannedRoute[(ri + 1) % ego.plannedRoute.length] ?? ego.plannedRoute[0]
          newProg = 0
        }

        const newRoad = ROAD_NETWORK.find(r => r.id === newRoadId) ?? egoRoad
        const pos = getLanePosition(newRoad, newProg, ego.lane)

        // Smooth heading lerp
        const targetHeading = pos.heading
        const currentHeading = ego.heading
        const headingDiff = normAngle(targetHeading - currentHeading)
        const newHeading = currentHeading + headingDiff * 0.15

        // Smooth speed
        const spdDiff = ego.targetSpeed - ego.speed
        const newSpeed = ego.speed + Math.sign(spdDiff) * Math.min(Math.abs(spdDiff), 2)

        const routeIdx = ego.plannedRoute.indexOf(newRoadId)
        const routeProg = routeIdx / Math.max(1, ego.plannedRoute.length - 1)

        setEgoVehicle({
          lng: pos.lng,
          lat: pos.lat,
          heading: newHeading,
          speed: newSpeed,
          roadId: newRoadId,
          roadProgress: newProg,
          routeProgress: routeProg,
        })
      }

      // ── Move traffic vehicles ───────────────────────────────────────────────
      const updated = vehiclesRef.current.map(v => {
        const road = ROAD_NETWORK.find(r => r.id === v.roadId)
        if (!road) return v

        const roadLen = getRoadLength(road)
        const dir = v.isWrongWay ? -1 : 1
        const delta = (v.speed / 3.6) * DT / roadLen
        let newProg = v.roadProgress + delta * dir

        // Recycle onto new road when reaching end
        let newRoad = road
        if (newProg > 1 || newProg < 0) {
          newRoad = randomRoad()
          newProg = v.isWrongWay ? 0.9 : 0.05 + Math.random() * 0.2
        }

        // ── LANE POSITION (key: use getLanePosition, not centerline) ──────────
        const lanePos = getLanePosition(newRoad, newProg, v.lane)
        
        // ── SMOOTH HEADING LERP ───────────────────────────────────────────────
        const targetHeading = v.isWrongWay ? lanePos.heading + Math.PI : lanePos.heading
        const hDiff = normAngle(targetHeading - v.heading)
        const newHeading = v.heading + hDiff * 0.15

        // ── ROAD SNAP VALIDATION ──────────────────────────────────────────────
        let finalLng = lanePos.lng
        let finalLat = lanePos.lat
        const distFromRoad = haversineM(lanePos.lng, lanePos.lat, v.lng, v.lat)
        if (distFromRoad > SNAP_THRESHOLD) {
          const snappedT = projectOntoRoad(newRoad, finalLng, finalLat)
          const snapped = getLanePosition(newRoad, snappedT, v.lane)
          finalLng = snapped.lng
          finalLat = snapped.lat
        }

        // History
        const hist = [{ lng: v.lng, lat: v.lat }, ...v.positionHistory].slice(0, HISTORY_LENGTH)

        // Distance & closing speed
        const ego = egoRef.current
        const dist = haversineM(finalLng, finalLat, ego.lng, ego.lat)
        const prevDist = haversineM(v.lng, v.lat, ego.lng, ego.lat)
        const closingSpeed = ((prevDist - dist) / DT) * 3.6 // km/h

        // TTC
        const closingMs = closingSpeed / 3.6
        const ttc = closingMs > 0.5 ? dist / closingMs : Infinity

        // Predicted path — 6 steps ahead along road
        const predicted: { lng: number; lat: number }[] = []
        for (let fi = 1; fi <= 6; fi++) {
          const ft = Math.max(0, Math.min(1, newProg + delta * dir * fi * 4))
          const fp = getLanePosition(newRoad, ft, v.lane)
          predicted.push({ lng: fp.lng, lat: fp.lat })
        }

        // ── FOLLOWING DISTANCE — slow if too close to vehicle ahead ──────────
        const sameRoadVehicles = vehiclesRef.current.filter(
          other => other.id !== v.id && other.roadId === newRoad.id && !other.isWrongWay
        )
        const ahead = sameRoadVehicles.find(other => {
          const od = haversineM(other.lng, other.lat, ego.lng, ego.lat)
          return od < dist && haversineM(other.lng, other.lat, finalLng, finalLat) < FOLLOW_DISTANCE
        })

        let targetSpeed = v.targetSpeed
        if (ahead) {
          // Slow to match ahead vehicle speed + buffer
          targetSpeed = Math.min(targetSpeed, ahead.speed * 0.9)
        }

        // Random target speed variance (2% chance)
        if (!ahead && Math.random() < 0.02) {
          const sMod = VEHICLE_SPEED_MODIFIERS[v.type]
          const bMod = v.behavior === 'aggressive' || v.behavior === 'speeding' ? 1.3
            : v.behavior === 'slow' ? 0.55 : 1.0
          targetSpeed = newRoad.speedLimit * sMod * bMod * (0.85 + Math.random() * 0.35)
        }

        // Smooth speed
        const spdDiff = targetSpeed - v.speed
        const newSpeed = Math.max(0, v.speed + Math.sign(spdDiff) * Math.min(Math.abs(spdDiff), 3))

        // Random behavior switch (0.5% chance)
        const bPool: DriverBehavior[] = ['normal', 'normal', 'normal', 'aggressive', 'slow', 'erratic', 'speeding']
        let behavior = v.behavior
        if (Math.random() < 0.005 && behavior !== 'wrong_way') {
          behavior = bPool[Math.floor(Math.random() * bPool.length)]
        }

        const partial: Vehicle = {
          ...v,
          roadId: newRoad.id,
          roadProgress: newProg,
          lane: v.lane,
          lng: finalLng,
          lat: finalLat,
          heading: newHeading,
          speed: newSpeed,
          targetSpeed,
          behavior,
          distance: dist,
          closingSpeed,
          ttc,
          positionHistory: hist,
          predictedPath: predicted,
        }

        partial.isWrongWay = detectWrongWay(partial)
        partial.relativeToEgo = calcRelativePos(partial, ego)
        partial.threatLevel = calcThreat(partial)

        if (partial.threatLevel !== 'none') {
          const alert = maybeAlert(partial)
          if (alert) addAlert(alert)
        }

        return partial
      })

      vehiclesRef.current = updated
      setVehicles(updated)
      tick()
    }, SIMULATION_INTERVAL)

    return () => clearInterval(interval)
  }, [isPaused, setEgoVehicle, setVehicles, addAlert, tick])
}
