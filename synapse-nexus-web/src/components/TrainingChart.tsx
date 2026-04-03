'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import axios from 'axios'

const API = '/api/proxy'

type MetricType = 'loss' | 'minADE_3' | 'minFDE_3' | 'OffRoadRate'

interface TrainingChartProps {
  metric: MetricType
}

interface EpochData {
  epoch: number
  train_loss: number
  minADE_3: number
  minFDE_3: number
  MissRate_2_3: number
  OffRoadRate: number
}

const metricConfig: Record<
  MetricType,
  { key: keyof EpochData; label: string; color: string; unit: string }
> = {
  loss: { key: 'train_loss', label: 'Training Loss', color: '#F5A623', unit: '' },
  minADE_3: { key: 'minADE_3', label: 'Min ADE@3', color: '#00FF88', unit: 'm' },
  minFDE_3: { key: 'minFDE_3', label: 'Min FDE@3', color: '#4A9EFF', unit: 'm' },
  OffRoadRate: { key: 'OffRoadRate', label: 'Off-Road Rate', color: '#FF3B3B', unit: '%' },
}

export default function TrainingChart({ metric }: TrainingChartProps) {
  const [data, setData] = useState<EpochData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get(`${API}/api/training-history`)
        setData(res.data)
      } catch (err) {
        console.error('Failed to fetch training history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-elevated border border-border p-6 h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-textsecondary font-mono-data">Loading history...</p>
        </div>
      </div>
    )
  }

  const config = metricConfig[metric]

  return (
    <div className="bg-elevated border border-border p-4 h-80">
      <h4 className="font-clash text-sm font-semibold text-textprimary mb-2">
        {config.label}
      </h4>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2535" />
          <XAxis
            dataKey="epoch"
            stroke="#8892A4"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fontSize: 10 }}
          />
          <YAxis
            stroke="#8892A4"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161B27',
              border: '1px solid #1E2535',
              borderRadius: '2px',
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
            }}
            labelStyle={{ color: '#E8EDF5' }}
            itemStyle={{ color: config.color }}
          />
          <Line
            type="monotone"
            dataKey={config.key}
            stroke={config.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: config.color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
