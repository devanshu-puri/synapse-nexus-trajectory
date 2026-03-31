'use client'

import { useTrafficStore } from '@/store/trafficStore'
import { THREAT_COLORS, type Vehicle } from '@/types/vehicle'

const POSITION_ARROWS: Record<string, string> = {
  ahead_same_lane: '↑',
  ahead_left_lane: '↖',
  ahead_right_lane: '↗',
  behind_same_lane: '↓',
  behind_left_lane: '↙',
  behind_right_lane: '↘',
  beside_left: '←',
  beside_right: '→',
  approaching_head_on: '⇊',
  oncoming: '↕',
  crossing: '✕',
  merging: '⤵',
}

const THREAT_BORDER: Record<string, string> = {
  critical: 'border-red-500',
  high: 'border-danger/60',
  medium: 'border-amber/50',
  low: 'border-blue/40',
  none: 'border-border',
}

const BEHAVIOR_BADGE: Record<string, { label: string; cls: string }> = {
  normal: { label: 'NORMAL', cls: 'text-textsecondary bg-elevated' },
  aggressive: { label: 'AGGRESS', cls: 'text-danger bg-danger/10' },
  slow: { label: 'SLOW', cls: 'text-blue bg-blue/10' },
  wrong_way: { label: 'WRONG WAY', cls: 'text-white bg-red-600' },
  erratic: { label: 'ERRATIC', cls: 'text-amber bg-amber/10' },
  tailgating: { label: 'TAILGATE', cls: 'text-amber bg-amber/10' },
  speeding: { label: 'SPEEDING', cls: 'text-danger bg-danger/10' },
  braking_hard: { label: 'BRAKING', cls: 'text-amber bg-amber/10' },
}

const THREAT_ORDER = ['critical', 'high', 'medium', 'low', 'none']

function sortVehicles(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => {
    const ta = THREAT_ORDER.indexOf(a.threatLevel)
    const tb = THREAT_ORDER.indexOf(b.threatLevel)
    if (ta !== tb) return ta - tb
    return a.distance - b.distance
  })
}

export default function VehicleList() {
  const { vehicles } = useTrafficStore()
  const sorted = sortVehicles(vehicles)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-textprimary text-xs font-semibold uppercase tracking-widest font-mono-data">
          Vehicles
        </span>
        <span className="text-textsecondary text-xs font-mono-data">{vehicles.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {sorted.map((v) => {
          const bhv = BEHAVIOR_BADGE[v.behavior] ?? BEHAVIOR_BADGE.normal
          const borderClass = THREAT_BORDER[v.threatLevel]

          return (
            <div
              key={v.id}
              className={`border rounded-sm p-2.5 bg-elevated ${borderClass} ${v.threatLevel === 'critical' ? 'animate-pulse' : ''}`}
            >
              {/* Header row */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: v.color }}
                />
                <span className="text-textprimary text-xs font-mono-data font-medium">{v.id}</span>
                <span className="text-textsecondary text-xs font-mono-data capitalize">{v.type}</span>
                <div className="ml-auto flex items-center gap-1">
                  {v.isWrongWay && (
                    <span className="text-xs font-mono-data font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-sm animate-pulse">
                      WRONG WAY
                    </span>
                  )}
                </div>
              </div>

              {/* Position row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-amber text-sm font-bold">
                  {POSITION_ARROWS[v.relativeToEgo] ?? '?'}
                </span>
                <span className="text-textsecondary text-xs font-mono-data capitalize">
                  {v.relativeToEgo.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                <div className="text-center bg-secondary rounded-sm py-0.5">
                  <div className="text-textprimary text-xs font-mono-data font-bold">
                    {Math.round(v.speed)}
                  </div>
                  <div className="text-textsecondary text-[9px] font-mono-data">km/h</div>
                </div>
                <div className="text-center bg-secondary rounded-sm py-0.5">
                  <div className="text-textprimary text-xs font-mono-data font-bold">
                    {Math.round(v.distance)}
                  </div>
                  <div className="text-textsecondary text-[9px] font-mono-data">m</div>
                </div>
                <div className="text-center bg-secondary rounded-sm py-0.5">
                  <div
                    className="text-xs font-mono-data font-bold"
                    style={{ color: THREAT_COLORS[v.threatLevel] }}
                  >
                    {isFinite(v.ttc) && v.ttc > 0 ? v.ttc.toFixed(1) : '∞'}
                  </div>
                  <div className="text-textsecondary text-[9px] font-mono-data">TTC</div>
                </div>
              </div>

              {/* Closing speed + behavior badge */}
              <div className="flex items-center gap-1 flex-wrap">
                {v.closingSpeed > 2 && (
                  <span className="text-danger text-[9px] font-mono-data">
                    +{Math.round(v.closingSpeed)} km/h closing
                  </span>
                )}
                <span className={`text-[9px] font-mono-data px-1 py-0.5 rounded-sm ${bhv.cls}`}>
                  {bhv.label}
                </span>
                {v.threatLevel !== 'none' && (
                  <span
                    className="text-[9px] font-mono-data px-1 py-0.5 rounded-sm font-bold uppercase"
                    style={{ color: THREAT_COLORS[v.threatLevel], backgroundColor: `${THREAT_COLORS[v.threatLevel]}15` }}
                  >
                    {v.threatLevel}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
