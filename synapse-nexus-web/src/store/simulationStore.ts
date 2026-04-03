import { create } from 'zustand'

export interface Agent {
  id: string
  position: { x: number; y: number }
  velocity: { x: number; y: number }
  heading: number
  risk: 'safe' | 'warning' | 'danger'
  intent: string
  intentConfidence: number
  trajectoryModes: Array<{ points: Array<{ x: number; y: number }>; probability: number }>
  ttc: number
  attentionWeights: number[]
}

export interface SimulationState {
  agents: Agent[]
  egoVehicle: { position: { x: number; y: number }; speed: number }
  systemStats: {
    latency: number
    agentsProcessed: number
  }
  lunaAlert: string
  updateSimulation: () => void
}

const SINGAPORE_CENTER = { lng: 103.8, lat: 1.35 }

function createInitialAgent(id: number, type: string): Agent {
  return {
    id: `agent-${id}`,
    position: { x: 0, y: id * 100 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    risk: 'safe',
    intent: type,
    intentConfidence: 0.85,
    trajectoryModes: [
      { points: [], probability: 0.7 },
      { points: [], probability: 0.2 },
      { points: [], probability: 0.1 }
    ],
    ttc: 0,
    attentionWeights: Array.from({ length: 8 }, () => 0.1)
  }
}

const initialAgents = [
  createInitialAgent(0, 'Wrong-Way Vehicle'),
  createInitialAgent(1, 'Pedestrian Crossing'),
  createInitialAgent(2, 'Leading Vehicle'),
  createInitialAgent(3, 'Parked Car'),
  createInitialAgent(4, 'Traffic'),
  createInitialAgent(5, 'Traffic'),
  createInitialAgent(6, 'Traffic'),
  createInitialAgent(7, 'Traffic')
]

export const useSimulationStore = create<SimulationState>()(
  (set, get) => ({
    agents: initialAgents,
    egoVehicle: {
      position: { x: 0, y: 0 },
      speed: 12.0
    },
    systemStats: {
      latency: 18,
      agentsProcessed: 0
    },
    lunaAlert: 'All systems nominal. Road clear.',
    
    updateSimulation: () => {
      const state = get()
      const dt = 0.5
      const egoSpeed = state.egoVehicle.speed
      const newEgoY = state.egoVehicle.position.y + egoSpeed * dt
      
      const updatedAgents = state.agents.map((agent) => {
        let newX = agent.position.x + agent.velocity.x * dt
        let newY = agent.position.y + agent.velocity.y * dt
        let newIntent = agent.intent
        let newVelX = agent.velocity.x
        let newVelY = agent.velocity.y

        if (newY < newEgoY - 50 || (agent.position.x === 0 && agent.position.y === 0)) {
          if (agent.id === 'agent-0') {
            // Wrong-way incoming car
            newY = newEgoY + 400
            newX = -3 // Slightly encroaching into ego lane
            newVelY = -15 // Fast incoming (negative Y)
            newVelX = 0
            newIntent = 'driving (wrong way)'
          } else if (agent.id === 'agent-1') {
            // Pedestrian crossing from the left sidewalk
            newY = newEgoY + 250
            newX = -25
            newVelY = 0
            newVelX = 1.8 // Walking right across the road
            newIntent = 'crossing'
          } else if (agent.id === 'agent-2') {
            // Slower car ahead in the same lane
            newY = newEgoY + 150
            newX = 0
            newVelY = 8 // Slower than ego's 12m/s
            newVelX = 0
            newIntent = 'cruising'
          } else if (agent.id === 'agent-3') {
            // Parked car
            newY = newEgoY + 350
            newX = 8 // Parked on the right
            newVelY = 0
            newVelX = 0
            newIntent = 'stopping'
          } else {
            // Background traffic
            newY = newEgoY + 200 + Math.random() * 400
            newX = (Math.random() > 0.5 ? 4 : -4) // Adjacent lanes
            newVelY = 10 + Math.random() * 4 // Moving same direction
            newVelX = 0
            newIntent = 'driving'
          }
        }

        const dx = newX
        const dy = newY - newEgoY
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        const relVx = newVelX
        const relVy = newVelY - egoSpeed
        
        let risk: 'safe' | 'warning' | 'danger' = 'safe'
        let ttc = 999

        const dotProduct = dx * relVx + dy * relVy
        if (dotProduct < 0) {
          const relSpeed = Math.sqrt(relVx*relVx + relVy*relVy)
          if (relSpeed > 0) {
            ttc = dist / relSpeed
            
            // Define risk thresholds based on intent
            if (agent.id === 'agent-0') { // High priority wrong-way
              if (ttc < 5.0) risk = 'danger'
              else if (ttc < 8.0) risk = 'warning'
            } else if (agent.id === 'agent-1') { // Pedestrian
              // Pedestrian is dangerous if crossing path exactly
              if (ttc < 4.0 && Math.abs(dx) < 15) risk = 'danger'
              else if (ttc < 7.0) risk = 'warning'
            } else {
              if (ttc < 3.0 && Math.abs(dx) < 3) risk = 'danger'
              else if (ttc < 5.0 && Math.abs(dx) < 5) risk = 'warning'
            }
          }
        }

        if (dist < 12 && Math.abs(dx) < 4) risk = 'danger'

        const trajectoryModes = []
        for (let m = 0; m < 3; m++) {
          const points = []
          for (let i = 1; i <= 6; i++) {
            // Add slight fan-out uncertainty
            const latOffset = (m === 1 ? 0 : m === 0 ? -1 : 1) * i * 0.5
            points.push({
              x: newX + newVelX * i * 0.5 + (newVelY !== 0 ? latOffset : 0),
              y: newY + newVelY * i * 0.5 + (newVelX !== 0 ? latOffset : 0)
            })
          }
          trajectoryModes.push({
            points,
            probability: m === 1 ? 0.8 : 0.1 // Middle path mostly confident
          })
        }

        return {
          ...agent,
          position: { x: newX, y: newY },
          velocity: { x: newVelX, y: newVelY },
          intent: newIntent,
          risk,
          ttc: ttc === 999 ? 0 : ttc,
          trajectoryModes,
          // Generate a fake orientation heading based on velocity
          heading: Math.atan2(newVelY, newVelX)
        }
      })
      
      let lunaAlert = 'All systems nominal. Road clear.'
      const dangerAgents = updatedAgents.filter(a => a.risk === 'danger')
      const warningAgents = updatedAgents.filter(a => a.risk === 'warning')

      if (dangerAgents.length > 0) {
        // Find most critical danger
        const critical = dangerAgents.sort((a, b) => a.ttc - b.ttc)[0]
        if (critical.id === 'agent-0') {
          const incomingSpeedKmh = Math.abs(critical.velocity.y) * 3.6
          lunaAlert = `CRITICAL ALERT: Wrong-way vehicle approaching at ${incomingSpeedKmh.toFixed(0)} km/h! EVASIVE ACTION REQUIRED. TTC: ${critical.ttc.toFixed(1)}s`
        } else if (critical.id === 'agent-1') {
          lunaAlert = `ALERT: Pedestrian entering crosswalk from left. BRAKE NOW. TTC: ${critical.ttc.toFixed(1)}s`
        } else {
          lunaAlert = `ALERT: Collision imminent with object ahead. TTC: ${critical.ttc.toFixed(1)}s`
        }
      } else if (warningAgents.length > 0) {
        const earliest = warningAgents.sort((a, b) => a.ttc - b.ttc)[0]
        if (earliest.id === 'agent-0') {
          lunaAlert = `WARNING: Oncoming vehicle encroaching lane ahead. Monitoring.`
        } else if (earliest.id === 'agent-1') {
          lunaAlert = `WARNING: Pedestrian approaching road edge. Prepare to yield.`
        } else if (earliest.id === 'agent-2') {
          lunaAlert = `WARNING: Slower vehicle ahead. Maintain following distance.`
        } else {
          lunaAlert = `Caution: Tracking activity ahead.`
        }
      }
      
      set({
        agents: updatedAgents,
        egoVehicle: {
          position: { x: 0, y: newEgoY },
          speed: egoSpeed
        },
        systemStats: {
          latency: 14 + Math.floor(Math.random() * 5),
          agentsProcessed: state.systemStats.agentsProcessed + updatedAgents.length
        },
        lunaAlert
      })
    }
  })
)
