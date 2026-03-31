'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color?: 'green' | 'amber' | 'red' | 'blue'
  icon?: ReactNode
}

export default function MetricCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  color = 'green',
  icon
}: MetricCardProps) {
  const colorClasses = {
    green: 'text-green',
    amber: 'text-amber',
    red: 'text-red',
    blue: 'text-blue'
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  }

  const trendColors = {
    up: 'text-green',
    down: 'text-red',
    neutral: 'text-textsecondary'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-elevated border border-border p-4 hover:border-amber transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-textsecondary text-xs uppercase tracking-widest font-mono-data">
          {label}
        </span>
        {icon && <span className="text-textsecondary">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`text-4xl font-bold font-mono-data ${colorClasses[color]}`}>
          {value}
        </span>
        {unit && (
          <span className="text-textsecondary text-sm font-mono-data">{unit}</span>
        )}
      </div>

      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trendColors[trend]}`}>
          <span>{trendIcons[trend]}</span>
          {trendLabel && <span className="font-mono-data">{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
