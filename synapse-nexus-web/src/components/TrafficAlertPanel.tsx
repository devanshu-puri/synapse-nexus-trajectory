'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTrafficStore } from '@/store/trafficStore'
import type { TrafficAlert } from '@/types/vehicle'

const SEVERITY_ICONS: Record<TrafficAlert['severity'], string> = {
  info: 'ℹ',
  warning: '⚠',
  danger: '⛔',
  critical: '🚨',
}

const SEVERITY_COLORS: Record<TrafficAlert['severity'], string> = {
  info: 'text-blue',
  warning: 'text-amber',
  danger: 'text-danger',
  critical: 'text-red-400',
}

const SEVERITY_BORDER: Record<TrafficAlert['severity'], string> = {
  info: 'border-blue/30',
  warning: 'border-amber/30',
  danger: 'border-danger/40',
  critical: 'border-red-500',
}

const SEVERITY_BG: Record<TrafficAlert['severity'], string> = {
  info: 'bg-elevated',
  warning: 'bg-elevated',
  danger: 'bg-danger/5',
  critical: 'bg-red-900/20',
}

export default function TrafficAlertPanel() {
  const { alerts, dismissAlert } = useTrafficStore()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-textprimary text-xs font-semibold uppercase tracking-widest font-mono-data">
          Alerts
        </span>
        {alerts.length > 0 && (
          <span className="text-xs font-mono-data text-amber">
            {alerts.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 py-4 justify-center"
            >
              <span className="text-green text-sm">✓</span>
              <span className="text-textsecondary text-xs font-mono-data">No active alerts</span>
            </motion.div>
          )}

          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative border rounded-sm p-3 cursor-pointer hover:opacity-80 transition-opacity ${SEVERITY_BORDER[alert.severity]} ${SEVERITY_BG[alert.severity]} ${alert.severity === 'critical' ? 'animate-pulse' : ''}`}
              onClick={() => dismissAlert(alert.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">{SEVERITY_ICONS[alert.severity]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-mono-data leading-snug ${SEVERITY_COLORS[alert.severity]}`}>
                    {alert.message}
                  </p>

                  {(alert.ttc != null || alert.distance != null) && (
                    <div className="flex gap-3 mt-1">
                      {alert.ttc != null && isFinite(alert.ttc) && (
                        <span className="text-xs font-mono-data text-textsecondary">
                          TTC: {alert.ttc.toFixed(1)}s
                        </span>
                      )}
                      {alert.distance != null && (
                        <span className="text-xs font-mono-data text-textsecondary">
                          {Math.round(alert.distance)}m
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs font-mono-data text-amber mt-1">
                    → {alert.action}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id) }}
                  className="text-textsecondary hover:text-textprimary text-xs leading-none flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
