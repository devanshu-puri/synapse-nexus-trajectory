'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ModelNode {
  id: string
  label: string
  isNovel: boolean
  x: number
  y: number
}

const nodes: ModelNode[] = [
  { id: 'history', label: 'Agent History\n4 × 6', isNovel: false, x: 50, y: 20 },
  { id: 'encoder', label: 'GRU Encoder', isNovel: false, x: 50, y: 80 },
  { id: 'social', label: 'Social Attention ★', isNovel: true, x: 50, y: 140 },
  { id: 'map', label: 'Map CNN\n3×100×100', isNovel: false, x: 50, y: 200 },
  { id: 'fusion', label: 'Context Fusion', isNovel: false, x: 50, y: 260 },
  { id: 'intent', label: 'Intent Classifier ★', isNovel: true, x: 50, y: 320 },
  { id: 'goal', label: 'Goal Predictor\nK=3', isNovel: false, x: 50, y: 380 },
  { id: 'decoder', label: 'GRU Decoder × 3', isNovel: false, x: 50, y: 440 },
  { id: 'occupancy', label: 'Occupancy Scorer ★', isNovel: true, x: 50, y: 500 },
  { id: 'output', label: '3 Trajectories\n+ Intent', isNovel: true, x: 50, y: 560 },
]

export default function ModelDiagram() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % nodes.length)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-elevated border border-border p-6 h-full">
      <h3 className="font-clash text-sm font-semibold text-textprimary mb-4">
        Model Architecture
      </h3>
      <p className="text-xs text-textsecondary font-mono-data mb-6">
        Forward pass simulation — watch the data flow
      </p>

      <svg
        viewBox="0 0 200 600"
        className="w-full h-auto"
        style={{ maxHeight: '500px' }}
      >
        {/* Connection lines */}
        {nodes.slice(0, -1).map((node, i) => {
          const nextNode = nodes[i + 1]
          return (
            <motion.line
              key={`line-${i}`}
              x1={node.x + 75}
              y1={node.y + 30}
              x2={nextNode.x + 75}
              y2={nextNode.y}
              stroke={activeIndex > i ? '#F5A623' : '#1E2535'}
              strokeWidth="2"
              strokeDasharray="4 2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: activeIndex > i ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={node.id}>
            {/* Node box */}
            <motion.rect
              x={node.x}
              y={node.y}
              width="150"
              height="40"
              fill={activeIndex === i ? 'rgba(245, 166, 35, 0.1)' : '#161B27'}
              stroke={node.isNovel ? '#F5A623' : '#1E2535'}
              strokeWidth={node.isNovel ? 1.5 : 1}
              rx="2"
              animate={{
                stroke: activeIndex === i ? '#F5A623' : node.isNovel ? '#F5A623' : '#1E2535',
                strokeWidth: activeIndex === i ? 2 : node.isNovel ? 1.5 : 1,
              }}
              transition={{ duration: 0.2 }}
            />

            {/* Node label */}
            <text
              x={node.x + 75}
              y={node.y + 16}
              fill={activeIndex === i ? '#F5A623' : '#E8EDF5'}
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={node.isNovel ? 600 : 400}
              textAnchor="middle"
              className="select-none"
            >
              {node.label.split('\n')[0]}
            </text>
            {node.label.includes('\n') && (
              <text
                x={node.x + 75}
                y={node.y + 28}
                fill={activeIndex === i ? '#F5A623' : '#8892A4'}
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                className="select-none"
              >
                {node.label.split('\n')[1]}
              </text>
            )}

            {/* Active pulse */}
            {activeIndex === i && (
              <motion.circle
                cx={node.x + 145}
                cy={node.y + 5}
                r="3"
                fill="#00FF88"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 1.5] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-amber" />
          <span className="text-textsecondary font-mono-data">Novel Component</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green rounded-full" />
          <span className="text-textsecondary font-mono-data">Active Node</span>
        </div>
      </div>
    </div>
  )
}
