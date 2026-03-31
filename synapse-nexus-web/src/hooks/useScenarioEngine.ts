'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type {
  WorldPos, SimVehicle, EgoState, ActiveAlert,
  AlertHistoryEntry, SystemStats, ScenarioState, RiskState,
} from '@/types/simulation'

// ─── Ego Path (Singapore Onenorth, 20 waypoints, 3000×3000 world) ─────────────
const EGO_PATH: WorldPos[] = [
  { x: 1480, y: 3000 }, { x: 1480, y: 2500 }, { x: 1480, y: 2000 },
  { x: 1480, y: 1500 }, { x: 1480, y: 1000 }, { x: 1480, y: 500 },
  { x: 1480, y: 0 },
]

// Lane Constants
const LANE_1_X = 1480
const LANE_2_X = 1520
const SHOULDER_L = 1455
const SHOULDER_R = 1545
const FOOTPATH_L = 1440
const FOOTPATH_R = 1560

// ─── Path helpers ─────────────────────────────────────────────────────────────
function buildLengths(path: WorldPos[]): number[] {
  const lens = [0]
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x
    const dy = path[i].y - path[i - 1].y
    lens.push(lens[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return lens
}

const PATH_LENGTHS = buildLengths(EGO_PATH)
const TOTAL_PATH_LEN = PATH_LENGTHS[PATH_LENGTHS.length - 1]

function posAtDist(dist: number): { pos: WorldPos; heading: number } {
  dist = ((dist % TOTAL_PATH_LEN) + TOTAL_PATH_LEN) % TOTAL_PATH_LEN
  for (let i = 1; i < PATH_LENGTHS.length; i++) {
    if (dist <= PATH_LENGTHS[i]) {
      const t = (dist - PATH_LENGTHS[i - 1]) / (PATH_LENGTHS[i] - PATH_LENGTHS[i - 1])
      const a = EGO_PATH[i - 1], b = EGO_PATH[i]
      const pos: WorldPos = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
      const heading = Math.atan2(b.x - a.x, -(b.y - a.y))
      return { pos, heading }
    }
  }
  return { pos: EGO_PATH[0], heading: 0 }
}

// Convert ego-relative offset to world coords
function relToWorld(
  ego: { x: number; y: number; heading: number },
  fwd: number,   // positive = ahead
  lat: number,   // positive = right
): WorldPos {
  const h = ego.heading
  return {
    x: ego.x + fwd * Math.sin(h) + lat * Math.cos(h),
    y: ego.y - fwd * Math.cos(h) + lat * Math.sin(h),
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// Build trajectory points from a start pos, heading, curvature, steps
function buildTraj(
  start: WorldPos,
  heading: number,
  steps: number,
  curvature: number,
  stepDist = 38,
): WorldPos[] {
  const pts: WorldPos[] = []
  let x = start.x, y = start.y, h = heading
  for (let i = 0; i < steps; i++) {
    h += curvature
    x += stepDist * Math.sin(h)
    y -= stepDist * Math.cos(h)
    pts.push({ x, y })
  }
  return pts
}

// Build trail (last N positions at decreasing time offsets)
function buildTrail(
  egoHeading: number,
  vehFwdAtT: (dt: number) => number,
  vehLatAtT: (dt: number) => number,
  egoX: number, egoY: number,
): WorldPos[] {
  const trail: WorldPos[] = []
  for (let i = 1; i <= 4; i++) {
    const dt = i * 0.12 // seconds back
    const fwd = vehFwdAtT(dt)
    const lat = vehLatAtT(dt)
    const ego = { x: egoX, y: egoY, heading: egoHeading }
    trail.push(relToWorld(ego, fwd, lat))
  }
  return trail
}

// ─── Scenario metadata ────────────────────────────────────────────────────────
const SCENARIOS = [
  { 
    name: 'Overtaking Vehicle', 
    dur: 28000, 
    desc: 'An approaching vehicle V1 plans to overtake you. Watch how Synapse Nexus predicts its trajectory before it moves.' 
  },
  { 
    name: 'Wrong Way Driver', 
    dur: 32000, 
    desc: 'CRITICAL: A vehicle is detected entering your lane from the opposite direction. Immediate evasive action recommended.' 
  },
  { 
    name: 'Pedestrian Crossing', 
    dur: 22000, 
    desc: 'Pedestrian P1 is approaching the road. The system detects crossing intent and prepares to yield.' 
  },
  { 
    name: 'Chain Brake Event', 
    dur: 28000, 
    desc: 'Traffic ahead is slowing rapidly. V2N broadcast ensures the vehicle behind you is also alerted to prevent a collision.' 
  },
]
const GAP_DUR = 4000 // 4s gap between scenarios
const SCENARIO_TOTAL_DUR = SCENARIOS.reduce((s, sc) => s + sc.dur + GAP_DUR, 0)

function getScenario(elapsed: number): { idx: number; t: number; isGap: boolean } {
  let rem = elapsed % SCENARIO_TOTAL_DUR
  for (let i = 0; i < SCENARIOS.length; i++) {
    if (rem < SCENARIOS[i].dur) return { idx: i, t: rem / 1000, isGap: false }
    rem -= SCENARIOS[i].dur
    if (rem < GAP_DUR) return { idx: i, t: rem / 1000, isGap: true }
    rem -= GAP_DUR
  }
  return { idx: 0, t: 0, isGap: false }
}

// ─── Per-scenario vehicle factories ───────────────────────────────────────────

interface ScenarioFrame {
  vehicles: SimVehicle[]
  alertTitle: string | null
  alertDetail: string | null
  alertSeverity: 'warning' | 'danger'
  ttc: number | null
  lunaKey: string | null
  lunaText: string | null
  targetSpeed: number
  dangerMode: boolean
  screenFlash: boolean
  suggestedAction?: {
    label: string
    detail: string
    severity: 'info' | 'warning' | 'danger'
    laneDiagram?: 'hold' | 'move-right' | 'brake'
  }
}

function noFrame(targetSpeed = 45): ScenarioFrame {
  return {
    vehicles: [], alertTitle: null, alertDetail: null,
    alertSeverity: 'warning', ttc: null,
    lunaKey: null, lunaText: null,
    targetSpeed, dangerMode: false, screenFlash: false,
    suggestedAction: {
      label: 'Continue',
      detail: 'Route optimal. Lane 1 clear.',
      severity: 'info'
    }
  }
}

// Scenario 1: Overtaking Vehicle (28s)
function scenario1(t: number, ego: { x: number; y: number; heading: number }): ScenarioFrame {
  const frame = noFrame(45)
  if (t > 26) return frame

  let lunaKey: string | null = null, lunaText: string | null = null
  let v1X = LANE_1_X
  let fwd = -250

  if (t < 5) {
    fwd = -250; v1X = LANE_1_X
  } else if (t < 12) {
    const p = (t - 5) / 7
    fwd = lerp(-250, -80, p)
    v1X = LANE_1_X
    if (t < 5.2) { lunaKey = 's1-approach'; lunaText = 'Vehicle approaching from behind. Monitoring.' }
  } else if (t < 20) {
    const p = (t - 12) / 8
    fwd = lerp(-80, 200, p)
    // Lane change lerp (0.03 per frame approx, here we use t-based lerp for scenario logic)
    v1X = lerp(LANE_1_X, LANE_2_X, clamp((t - 12) / 3, 0, 1))
    if (t < 12.2) { lunaKey = 's1-overtake'; lunaText = 'Vehicle V1 changing lanes to overtake. No action required.' }
  } else {
    fwd = 200; v1X = LANE_2_X
    if (t < 20.2) { lunaKey = 's1-passed'; lunaText = 'V1 has passed. Route clear.' }
  }

  const vPos = { x: v1X, y: ego.y - fwd } // Fixed to road X
  const v1: SimVehicle = {
    id: 'V1', label: 'V1', kind: 'car',
    x: vPos.x, y: vPos.y, heading: 0,
    risk: t > 5 && t < 15 ? 'warning' : 'safe', visible: true, braking: false, isWrongWay: false, showV2N: false,
    trail: [1, 2, 3, 4].map(i => ({ x: vPos.x, y: vPos.y + i * 20 })),
    traj1: buildTraj(vPos, 0, 6, 0),
    traj2: buildTraj(vPos, 0, 6, 0.02),
    traj3: buildTraj(vPos, 0, 6, -0.02),
  }
  frame.vehicles.push(v1)

  if (v1.risk === 'warning') {
    frame.alertTitle = '⚠ V1 APPROACHING'
    frame.alertDetail = `Vehicle V1 approaching from rear in Lane 1`
    frame.suggestedAction = {
      label: 'Hold Lane',
      detail: 'V1 Overtaking on Right',
      severity: 'warning',
      laneDiagram: 'hold'
    }
  }

  frame.lunaKey = lunaKey; frame.lunaText = lunaText
  return frame
}

// Scenario 2: Wrong Way Driver (32s)
function scenario2(t: number, ego: { x: number; y: number; heading: number }): ScenarioFrame {
  const frame = noFrame(45)
  if (t < 2 || t > 28) return frame

  let lunaKey: string | null = null, lunaText: string | null = null
  let dangerMode = false

  // V2 coming toward ego in Lane 1 (wrong way)
  const fwd = 600 - t * 45 // Slower closing speed
  const ttc = fwd / 45

  if (fwd > -100) {
    const vPos = { x: LANE_1_X, y: ego.y - fwd }
    const v2: SimVehicle = {
      id: 'V2', label: 'V2', kind: 'car',
      x: vPos.x, y: vPos.y, heading: Math.PI, // Facing down
      risk: fwd < 400 ? 'danger' : 'warning', visible: true, braking: false, isWrongWay: true, showV2N: false,
      trail: [1, 2, 3, 4].map(i => ({ x: vPos.x, y: vPos.y - i * 20 })),
      traj1: buildTraj(vPos, Math.PI, 6, 0),
      traj2: [], traj3: [],
    }
    frame.vehicles.push(v2)

    if (v2.risk === 'danger') {
      dangerMode = true
      frame.alertTitle = '⚠ WRONG WAY VEHICLE'
      frame.alertDetail = `V2 in Lane 1 | TTC: ${Math.max(0.1, ttc).toFixed(1)}s`
      frame.alertSeverity = 'danger'
      frame.ttc = ttc
      frame.targetSpeed = 15
      frame.suggestedAction = {
        label: 'Move to Lane 2',
        detail: 'Avoid Oncoming Vehicle',
        severity: 'danger',
        laneDiagram: 'move-right'
      }
    }
    if (t < 2.2) { lunaKey = 's2-warn'; lunaText = 'Critical: Wrong-way vehicle detected in Lane 1. Switch to Lane 2 immediately.' }
  } else {
     frame.alertTitle = '✓ THREAT RESOLVED'
     frame.alertDetail = 'Wrong-way vehicle passed.'
     if (t < 25) { lunaKey = 's2-clear'; lunaText = 'Wrong-way vehicle has passed. Resume normal speed.' }
  }

  frame.dangerMode = dangerMode
  frame.lunaKey = lunaKey; frame.lunaText = lunaText
  return frame
}

// Scenario 3: Pedestrian Crossing (22s)
function scenario3(t: number, ego: { x: number; y: number; heading: number }): ScenarioFrame {
  const frame = noFrame(45)
  if (t > 19) return frame

  let lunaKey: string | null = null, lunaText: string | null = null
  const baseFwd = 150
  
  // P1 at constant Y, moving from Footpath L to R
  const x = lerp(FOOTPATH_L, FOOTPATH_R, clamp(t / 15, 0, 1))
  const pPos = { x, y: ego.y - baseFwd }
  
  const isCrossing = x > FOOTPATH_L + 10 && x < FOOTPATH_R - 10
  const risk = isCrossing ? (t < 10 ? 'danger' : 'warning') : 'safe'

  const p1: SimVehicle = {
    id: 'P1', label: 'P1', kind: 'pedestrian',
    x: pPos.x, y: pPos.y, heading: Math.PI / 2,
    risk, visible: true, braking: false, isWrongWay: false, showV2N: false,
    trail: [1, 2, 3, 4].map(i => ({ x: pPos.x - i * 5, y: pPos.y })),
    traj1: buildTraj(pPos, Math.PI / 2, 4, 0, 10),
    traj2: [], traj3: [],
  }
  frame.vehicles.push(p1)

  if (isCrossing) {
    frame.alertTitle = '⚠ PEDESTRIAN CROSSING'
    frame.alertDetail = 'Pedestrian detected in roadway'
    frame.targetSpeed = 10
    frame.suggestedAction = {
      label: 'Yield',
      detail: 'Pedestrian in Crosswalk',
      severity: 'warning'
    }
    if (t < 4.2) { lunaKey = 's3-predict'; lunaText = 'Pedestrian P1 predicted to cross. Yielding.' }
  }

  frame.lunaKey = lunaKey; frame.lunaText = lunaText
  return frame
}

// Scenario 4: Chain Brake (28s)
function scenario4(t: number, ego: { x: number; y: number; heading: number }): ScenarioFrame {
  const frame = noFrame(45)
  if (t > 24) return frame

  let v1Braking = t > 8 && t < 16
  let fwd = 100
  if (v1Braking) {
    frame.targetSpeed = 18
    frame.alertTitle = '⚠ V1 BRAKING HARD'
    frame.alertDetail = 'Deceleration detected: 0.8g'
    frame.suggestedAction = {
      label: 'Reduce Speed',
      detail: 'Maintain 2s gap',
      severity: 'warning',
      laneDiagram: 'brake'
    }
  }

  const v1Pos = { x: LANE_1_X, y: ego.y - fwd }
  const v1: SimVehicle = {
    id: 'V1', label: 'V1', kind: 'car',
    x: v1Pos.x, y: v1Pos.y, heading: 0,
    risk: v1Braking ? 'warning' : 'safe', visible: true, braking: v1Braking, isWrongWay: false, showV2N: false,
    trail: [1, 2, 3, 4].map(i => ({ x: v1Pos.x, y: v1Pos.y + i * 20 })),
    traj1: buildTraj(v1Pos, 0, 5, 0),
    traj2: [], traj3: [],
  }
  
  frame.vehicles.push(v1)
  if (t > 10 && t < 18) {
    if (t < 10.2) { frame.lunaKey = 's4-brake'; frame.lunaText = 'Vehicle ahead braking. Adjusting speed.' }
    frame.vehicles[0].showV2N = true
  }

  return frame
}

// ─── Main Hook ────────────────────────────────────────────────────────────────
const INITIAL_STATE: ScenarioState = {
  vehicles: [],
  ego: { x: LANE_1_X, y: 3000, heading: 0, displaySpeed: 45, targetSpeed: 45, braking: false, odometer: 247.3, trip: 0 },
  activeAlert: null,
  alertHistory: [],
  lunaMessage: 'All systems nominal.',
  stats: { agentCount: 4, intentAccuracy: 94, scenarioIndex: 1, scenarioName: 'Overtaking Vehicle', scenarioProgress: 0, scenarioTimeRemaining: 28 },
  dangerMode: false,
  screenFlash: false,
  showIntroCard: false,
  introCardData: null,
}

export function useScenarioEngine() {
  const [state, setState] = useState<ScenarioState>(INITIAL_STATE)
  const stateRef = useRef<ScenarioState>(INITIAL_STATE)

  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const lastUIUpdateRef = useRef<number>(0)
  const spokenKeysRef = useRef<Set<string>>(new Set())
  const alertHistoryRef = useRef<AlertHistoryEntry[]>([])
  const activeAlertIdRef = useRef<string | null>(null)
  const displaySpeedRef = useRef<number>(45)
  const egoDistRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.92; utt.pitch = 1.05; utt.volume = 1.0
    const voices = window.speechSynthesis.getVoices()
    const female = voices.find(v =>
      v.name.includes('Female') || v.name.includes('Samantha') ||
      v.name.includes('Google UK English Female') || v.name.includes('Zira')
    )
    if (female) utt.voice = female
    window.speechSynthesis.speak(utt)
  }, [])

  useEffect(() => {
    startTimeRef.current = performance.now()
    lastFrameTimeRef.current = performance.now()

    const update = () => {
      const now = performance.now()
      const elapsed = now - startTimeRef.current
      const dt = (now - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = now

      // Ego path movement at 48 px/s (Reduced by 60% from 120)
      egoDistRef.current += 48 * dt
      const { pos: egoPos, heading: egoHeading } = posAtDist(egoDistRef.current)

      // Scenario timing
      const { idx, t, isGap } = getScenario(elapsed)
      const sc = SCENARIOS[idx]
      const ego = { x: egoPos.x, y: egoPos.y, heading: egoHeading }

      // Compute scenario frame
      let frame: ScenarioFrame
      if (isGap) {
        frame = noFrame(45)
      } else if (idx === 0) frame = scenario1(t, ego)
      else if (idx === 1) frame = scenario2(t, ego)
      else if (idx === 2) frame = scenario3(t, ego)
      else frame = scenario4(t, ego)

      // Smooth display speed (lerp 0.05)
      displaySpeedRef.current = displaySpeedRef.current + (frame.targetSpeed - displaySpeedRef.current) * 0.05

      // Odometer increments (km/h -> km per frame)
      const distKm = (displaySpeedRef.current / 3600) * dt
      const newOdo = stateRef.current.ego.odometer + distKm
      const newTrip = stateRef.current.ego.trip + distKm

      const egoState = {
        x: egoPos.x, y: egoPos.y, heading: egoHeading,
        displaySpeed: Math.round(displaySpeedRef.current),
        targetSpeed: frame.targetSpeed,
        braking: frame.targetSpeed < displaySpeedRef.current - 5,
        odometer: newOdo,
        trip: newTrip,
      }

      // Intro Card logic: show for first 3s of scenario
      const showIntroCard = !isGap && t < 3
      const introCardData = showIntroCard ? { title: sc.name, description: sc.desc, scenarioNumber: idx + 1 } : null

      // Luna speech
      if (frame.lunaKey && frame.lunaText && !spokenKeysRef.current.has(frame.lunaKey)) {
        spokenKeysRef.current.add(frame.lunaKey)
        speak(frame.lunaText)
      }

      // Alert history (same as before)
      let activeAlert: ScenarioState['activeAlert'] = null
      if (frame.alertTitle) {
        const alertId = `s${idx}-${Math.floor(t)}`
        if (alertId !== activeAlertIdRef.current) {
          if (activeAlertIdRef.current) {
            alertHistoryRef.current = alertHistoryRef.current.map(e =>
              e.status === 'active' ? { ...e, status: 'resolved' } : e
            )
          }
          activeAlertIdRef.current = alertId
          const newEntry: AlertHistoryEntry = {
            id: alertId,
            title: frame.alertTitle!,
            detail: frame.alertDetail!,
            timestamp: Date.now(),
            status: 'active',
            severity: frame.alertSeverity,
          }
          alertHistoryRef.current = [newEntry, ...alertHistoryRef.current].slice(0, 20)
        }
        activeAlert = {
          id: alertId,
          severity: frame.alertSeverity,
          title: frame.alertTitle,
          detail: frame.alertDetail!,
          ttc: frame.ttc,
          createdAt: now,
        }
      } else {
        if (activeAlertIdRef.current) {
          alertHistoryRef.current = alertHistoryRef.current.map(e =>
            e.status === 'active' ? { ...e, status: 'resolved' } : e
          )
          activeAlertIdRef.current = null
        }
      }

      const newState: ScenarioState = {
        vehicles: frame.vehicles,
        ego: egoState,
        activeAlert,
        alertHistory: alertHistoryRef.current,
        lunaMessage: frame.lunaText || stateRef.current.lunaMessage,
        stats: {
          agentCount: frame.vehicles.length + 1,
          intentAccuracy: idx === 2 ? 91 : idx === 1 ? 96 : 94,
          scenarioIndex: idx + 1,
          scenarioName: isGap ? 'Calm Driving' : sc.name,
          scenarioProgress: isGap ? 1 : t * 1000 / sc.dur,
          scenarioTimeRemaining: isGap ? 0 : Math.max(0, Math.round(sc.dur / 1000 - t)),
        },
        dangerMode: frame.dangerMode,
        screenFlash: frame.screenFlash,
        showIntroCard,
        introCardData,
      }

      stateRef.current = newState
      if (now - lastUIUpdateRef.current > 16) {
        lastUIUpdateRef.current = now
        setState({ ...newState })
      }
      rafRef.current = requestAnimationFrame(update)
    }

    rafRef.current = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [speak])

  return { state, stateRef }
}
