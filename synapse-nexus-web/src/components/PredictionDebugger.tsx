'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'

// Helper functions that might not be in utils yet
function riskToColor(risk: string) {
  if (risk === 'danger') return '#FF3B3B'
  if (risk === 'warning') return '#F5A623'
  return '#00FF88'
}
function intentToLabel(intent: string) {
  return intent
}

export default function PredictionDebugger() {
  const { agents } = useSimulationStore()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0]

  useEffect(() => {
    if (!selectedAgent) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    // Clear
    ctx.fillStyle = '#080B14'
    ctx.fillRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = '#1E2535'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Draw agent at center
    const cx = w / 2
    const cy = h / 2

    ctx.fillStyle = riskToColor(selectedAgent.risk)
    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fill()

    // Draw 3 trajectory modes
    selectedAgent.trajectoryModes.forEach((mode, mIndex) => {
      const opacity = mIndex === 0 ? 1 : mIndex === 1 ? 0.6 : 0.3
      const lineWidth = mIndex === 0 ? 3 : mIndex === 1 ? 2 : 1.5

      ctx.strokeStyle = riskToColor(selectedAgent.risk)
      ctx.globalAlpha = opacity
      ctx.lineWidth = lineWidth
      ctx.setLineDash([4, 2])

      ctx.beginPath()
      ctx.moveTo(cx, cy)

      mode.points.forEach((step, sIndex) => {
        // Draw relative path since agent is at center
        const dx = step.x - selectedAgent.position.x
        const dy = step.y - selectedAgent.position.y
        ctx.lineTo(cx + dx * 2, cy - dy * 2) // scale up for Mini BEV
      })

      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    })

    // Draw mode labels
    ctx.font = '9px JetBrains Mono'
    ctx.fillStyle = '#8892A4'
    selectedAgent.trajectoryModes.forEach((mode, mIndex) => {
      if (mode.points.length > 0) {
        const lastStep = mode.points[mode.points.length - 1]
        const dx = lastStep.x - selectedAgent.position.x
        const dy = lastStep.y - selectedAgent.position.y
        ctx.fillText(`Mode ${mIndex + 1}`, cx + dx * 2 + 5, cy - dy * 2)
      }
    })
  }, [selectedAgent])

  if (agents.length === 0) {
    return (
      <div className="bg-elevated border border-border p-6 h-full flex items-center justify-center">
        <p className="text-textsecondary text-sm font-mono-data">No agents detected</p>
      </div>
    )
  }

  const intentLabels = ['cross_road', 'continue', 'stop', 'turn']
  const intentProbs = [0.15, 0.65, 0.1, 0.1] // mock based on agent intent

  return (
    <div className="bg-elevated border border-border p-4 h-full flex flex-col">
      <h3 className="font-clash text-sm font-semibold text-textprimary mb-3">
        Prediction Debugger
      </h3>

      {/* Agent selector */}
      <select
        value={selectedAgent.id}
        onChange={(e) => setSelectedAgentId(e.target.value)}
        className="w-full bg-secondary border border-border text-textprimary text-xs font-mono-data
          px-3 py-2 mb-4 focus:outline-none focus:border-amber transition-colors"
      >
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.id} — {intentToLabel(agent.intent)} — {agent.risk}
          </option>
        ))}
      </select>

      {/* Mini BEV canvas */}
      <div className="mb-4 border border-border">
        <canvas ref={canvasRef} width={240} height={240} className="w-full h-auto" />
      </div>

      {/* Mode probabilities */}
      <div className="mb-4">
        <p className="text-xs text-textsecondary font-mono-data mb-2">Trajectory Modes</p>
        <div className="space-y-1.5">
          {selectedAgent.trajectoryModes.map((mode, i) => {
            const prob = mode.probability || (i === 0 ? 0.72 : i === 1 ? 0.18 : 0.1)
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono-data text-textprimary w-12">
                  Mode {i + 1}
                </span>
                <div className="flex-1 h-2 bg-primary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-amber"
                    initial={{ width: 0 }}
                    animate={{ width: `${prob * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-xs font-mono-data text-textsecondary w-10 text-right">
                  {(prob * 100).toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Intent classification */}
      <div>
        <p className="text-xs text-textsecondary font-mono-data mb-2">Intent Classification</p>
        <div className="flex h-2 bg-primary rounded-full overflow-hidden">
          {intentLabels.map((label, i) => {
            const isActive = label === selectedAgent.intent || (label === 'continue' && selectedAgent.intent.includes('driving'))
            return (
              <motion.div
                key={label}
                className={isActive ? 'bg-green' : 'bg-border'}
                initial={{ width: 0 }}
                animate={{ width: `${(isActive ? 0.8 : 0.05) * 100}%` }} // Adjusted to feel dynamic
                transition={{ duration: 0.5 }}
              />
            )
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          {intentLabels.map((label, i) => {
             const isActive = label === selectedAgent.intent || (label === 'continue' && selectedAgent.intent.includes('driving'))
             return (
              <span
                key={label}
                className="text-xs font-mono-data"
                style={{
                  color: isActive ? '#00FF88' : '#8892A4',
                }}
              >
                {label === 'cross_road' ? 'cross' : label === 'continue' ? 'cont' : label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
