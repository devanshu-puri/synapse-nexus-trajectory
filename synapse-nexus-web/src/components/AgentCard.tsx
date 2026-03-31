'use client'

import { motion } from 'framer-motion'
import { Agent } from '@/store/simulationStore'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
  isSelected?: boolean
}

export default function AgentCard({ agent, onClick, isSelected }: AgentCardProps) {
  const riskColors = {
    safe: 'text-green',
    warning: 'text-amber',
    danger: 'text-red'
  }

  const riskBgColors = {
    safe: 'bg-green/10 border-green/30',
    warning: 'bg-amber/10 border-amber/30',
    danger: 'bg-red/10 border-red/30'
  }

  const intentLabels: Record<string, string> = {
    walking: 'Walking',
    crossing: 'Crossing',
    stopping: 'Stopped',
    turning: 'Turning'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onClick}
      className={`p-3 bg-elevated border rounded-sm cursor-pointer transition-all hover:border-amber ${
        isSelected ? 'border-amber' : 'border-border'
      } ${agent.risk === 'danger' ? 'border-l-2 border-l-red' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono-data text-xs text-textsecondary">{agent.id}</span>
        <span className={`font-mono-data text-xs ${riskColors[agent.risk]}`}>
          {agent.risk.toUpperCase()}
        </span>
      </div>

      <div className="mb-2">
        <span className="text-textprimary text-sm font-medium">
          {intentLabels[agent.intent] || agent.intent}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-textsecondary mb-1">
          <span>Confidence</span>
          <span className="font-mono-data text-textprimary">
            {(agent.intentConfidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-sm overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${agent.intentConfidence * 100}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${
              agent.intentConfidence > 0.8
                ? 'bg-green'
                : agent.intentConfidence > 0.6
                ? 'bg-amber'
                : 'bg-red'
            }`}
          />
        </div>
      </div>

      {agent.risk === 'danger' && agent.ttc > 0 && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <span className="text-red text-xs font-mono-data">TTC:</span>
          <span className="text-red text-sm font-bold font-mono-data">
            {agent.ttc.toFixed(1)}s
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
        <span className="text-textsecondary text-xs">Modes:</span>
        {agent.trajectoryModes.map((mode, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1"
          >
            <span className="text-xs font-mono-data text-textprimary">
              {idx + 1}
            </span>
            <span className="text-xs font-mono-data text-textsecondary">
              {(mode.probability * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted mt-2 font-mono-data">
        {new Date().toLocaleTimeString()}
      </div>
    </motion.div>
  )
}
