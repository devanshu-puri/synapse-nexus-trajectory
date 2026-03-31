'use client'

import { useEffect, useRef } from 'react'
import { useSimulationStore, Agent } from '@/store/simulationStore'

interface SimulationMiniMapProps {
  width?: number
  height?: number
}

export default function SimulationMiniMap({ width = 200, height = 200 }: SimulationMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { agents, egoVehicle } = useSimulationStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const render = () => {
      ctx.fillStyle = '#080B14'
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = '#1E2535'
      ctx.lineWidth = 1
      const gridSize = 20
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const centerX = width / 2
      const centerY = height / 2
      const scale = 1.5

      agents.forEach(agent => {
        const x = centerX + agent.position.x * scale
        const y = centerY + agent.position.y * scale

        const riskColors = {
          safe: '#00FF88',
          warning: '#F5A623',
          danger: '#FF3B3B'
        }
        const color = riskColors[agent.risk]

        if (agent.trajectoryModes[0]) {
          ctx.beginPath()
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.4
          const firstPoints = agent.trajectoryModes[0].points
          if (firstPoints.length > 0) {
            ctx.moveTo(x, y)
            firstPoints.forEach(p => {
              ctx.lineTo(centerX + p.x * scale, centerY + p.y * scale)
            })
            ctx.stroke()
          }
          ctx.globalAlpha = 1
        }

        ctx.beginPath()
        ctx.fillStyle = color
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()

        if (agent.risk === 'danger') {
          const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7
          ctx.beginPath()
          ctx.strokeStyle = '#FF3B3B'
          ctx.lineWidth = 2
          ctx.globalAlpha = pulse
          ctx.arc(x, y, 12, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      })

      const egoX = centerX + egoVehicle.position.x * scale
      const egoY = centerY + egoVehicle.position.y * scale

      ctx.save()
      ctx.shadowColor = '#F5A623'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(egoX - 5, egoY - 9, 10, 18)
      ctx.restore()

      animationId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [agents, egoVehicle, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-sm"
      style={{ background: '#080B14' }}
    />
  )
}
