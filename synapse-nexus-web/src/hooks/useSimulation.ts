import { useEffect, useRef } from 'react'
import { useSimulationStore, Agent } from '@/store/simulationStore'

export interface SimulationData {
  agents: Agent[]
  egoVehicle: { position: { x: number; y: number }; speed: number }
  systemStats: {
    latency: number
    agentsProcessed: number
  }
  lunaAlert: string
}

export function useSimulation(enabled: boolean = true): SimulationData {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const {
    agents,
    egoVehicle,
    systemStats,
    lunaAlert,
    updateSimulation
  } = useSimulationStore()

  useEffect(() => {
    if (enabled) {
      updateSimulation()
      intervalRef.current = setInterval(() => {
        updateSimulation()
      }, 500)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, updateSimulation])

  return {
    agents,
    egoVehicle,
    systemStats,
    lunaAlert
  }
}
