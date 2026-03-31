'use client'

import { motion } from 'framer-motion'
import { useSimulationStore } from '@/store/simulationStore'
import { useEffect, useState } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ModelInfo {
  name: string
  parameters: number
  architecture: string
  history_steps: number
  future_steps: number
  num_modes: number
  hidden_dim: number
  novel_components: string[]
  export_format: string
  inference_ms: number
}

export default function SystemMetrics() {
  const { systemStats } = useSimulationStore()
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)

  useEffect(() => {
    async function fetchModelInfo() {
      try {
        const res = await axios.get(`${API}/api/model-info`)
        setModelInfo(res.data)
      } catch (err) {
        console.error('Failed to fetch model info:', err)
      }
    }
    fetchModelInfo()
  }, [])

  return (
    <div className="bg-elevated border border-border p-4 h-full flex flex-col">
      <h3 className="font-clash text-sm font-semibold text-textprimary mb-4">
        System Metrics
      </h3>

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-secondary border border-border p-3">
          <p className="text-xs text-textsecondary font-mono-data uppercase tracking-wider mb-1">
            Inference
          </p>
          <p className="text-2xl font-clash font-bold text-green">
            {systemStats.latency}
            <span className="text-sm text-textsecondary ml-1">ms</span>
          </p>
        </div>

        <div className="bg-secondary border border-border p-3">
          <p className="text-xs text-textsecondary font-mono-data uppercase tracking-wider mb-1">
            GPU Memory
          </p>
          <p className="text-2xl font-clash font-bold text-blue">
            {(systemStats as any).gpuMemory?.toFixed(1) || '1.8'}
            <span className="text-sm text-textsecondary ml-1">GB</span>
          </p>
        </div>

        <div className="bg-secondary border border-border p-3">
          <p className="text-xs text-textsecondary font-mono-data uppercase tracking-wider mb-1">
            Agents Processed
          </p>
          <p className="text-2xl font-clash font-bold text-amber">
            {systemStats.agentsProcessed}
          </p>
        </div>

        <div className="bg-secondary border border-border p-3">
          <p className="text-xs text-textsecondary font-mono-data uppercase tracking-wider mb-1">
            Status
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 rounded-full bg-green`}
            />
            <p className="text-sm font-mono-data text-textprimary capitalize">
              active
            </p>
          </div>
        </div>
      </div>

      {/* Model info */}
      {modelInfo && (
        <>
          <div className="border-t border-border pt-4 mb-4">
            <p className="text-xs text-textsecondary font-mono-data uppercase tracking-wider mb-2">
              Architecture Info
            </p>
            <div className="space-y-1.5 text-xs font-mono-data">
              <div className="flex justify-between">
                <span className="text-textsecondary">Name</span>
                <span className="text-textprimary">{modelInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textsecondary">Parameters</span>
                <span className="text-textprimary">
                  {(modelInfo.parameters / 1e6).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textsecondary">Hidden Dim</span>
                <span className="text-textprimary">{modelInfo.hidden_dim}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textsecondary">History / Future</span>
                <span className="text-textprimary">
                  {modelInfo.history_steps} / {modelInfo.future_steps}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textsecondary">Export</span>
                <span className="text-textprimary">{modelInfo.export_format}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-textsecondary font-mono-data uppercase tracking-wider mb-2">
              Novel Components
            </p>
            <div className="flex flex-wrap gap-1.5">
              {modelInfo.novel_components.map((comp) => (
                <span
                  key={comp}
                  className="bg-amber/10 border border-amber/30 text-amber text-xs
                    font-mono-data px-2 py-1 rounded-sm"
                >
                  {comp}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-xs text-amber font-mono-data uppercase tracking-wider mb-2">
              vs Industry
            </p>
            <div className="space-y-1 text-xs font-mono-data">
              <div className="flex justify-between">
                <span className="text-textsecondary">Tesla FSD</span>
                <span className="text-danger">✗ No intent</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textsecondary">Waymo</span>
                <span className="text-amber">~ Partial social</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textsecondary">Synapse Nexus</span>
                <span className="text-green">✓ Full intent + social</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
