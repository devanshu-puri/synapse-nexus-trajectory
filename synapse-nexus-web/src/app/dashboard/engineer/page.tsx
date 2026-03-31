'use client'

import { useState } from 'react'
import { useSimulation } from '@/hooks/useSimulation'
import ModelDiagram from '@/components/ModelDiagram'
import dynamic from 'next/dynamic'
import PredictionDebugger from '@/components/PredictionDebugger'
import TrainingChart from '@/components/TrainingChart'
import SystemMetrics from '@/components/SystemMetrics'

const MapLibreMap = dynamic(() => import('@/components/MapLibreMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-secondary animate-pulse" />
})

type ChartTab = 'loss' | 'minADE_3' | 'minFDE_3' | 'OffRoadRate'

export default function EngineerDashboard() {
  const [chartTab, setChartTab] = useState<ChartTab>('minADE_3')

  // Start simulation
  useSimulation(true)

  const chartTabs: { key: ChartTab; label: string }[] = [
    { key: 'loss', label: 'Loss' },
    { key: 'minADE_3', label: 'ADE' },
    { key: 'minFDE_3', label: 'FDE' },
    { key: 'OffRoadRate', label: 'OffRoad' },
  ]

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col p-4 gap-4 overflow-auto">
      {/* TOP ROW: 3 columns */}
      <div className="grid grid-cols-3 gap-4 h-[50vh]">
        {/* Col 1: Model Architecture */}
        <div className="h-full overflow-hidden">
          <ModelDiagram />
        </div>

        {/* Col 2: Map with attention */}
        <div className="h-full overflow-hidden bg-elevated border border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="font-clash text-sm font-semibold text-textprimary">
              Live BEV + Attention
            </h3>
            <p className="text-xs text-textsecondary font-mono-data mt-1">
              Select an agent to see attention lines
            </p>
          </div>
          <div className="flex-1 relative">
            <MapLibreMap showAttentionWeights={true} />
          </div>
        </div>

        {/* Col 3: Prediction Debugger */}
        <div className="h-full overflow-hidden">
          <PredictionDebugger />
        </div>
      </div>

      {/* BOTTOM ROW: 2 columns */}
      <div className="grid grid-cols-2 gap-4 h-[45vh]">
        {/* Col 1: Training History Charts */}
        <div className="h-full overflow-hidden bg-elevated border border-border flex flex-col">
          <div className="border-b border-border p-3 flex justify-between items-center">
            <h3 className="font-clash text-sm font-semibold text-textprimary">
              Training History
            </h3>
            <div className="flex gap-2">
              {chartTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setChartTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-mono-data rounded-sm transition-all duration-200 ${
                    chartTab === tab.key
                      ? 'bg-amber text-primary font-semibold'
                      : 'bg-secondary text-textsecondary hover:text-textprimary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 p-3">
            <TrainingChart metric={chartTab} />
          </div>
        </div>

        {/* Col 2: System Metrics */}
        <div className="h-full overflow-hidden">
          <SystemMetrics />
        </div>
      </div>
    </div>
  )
}
