'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AlertHistoryEntry } from '@/types/simulation'

interface Props {
  entries: AlertHistoryEntry[]
  onClose: () => void
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  const rs = s % 60
  return `${m}m ${rs}s ago`
}

function SeverityDot({ sev, active }: { sev: AlertHistoryEntry['severity']; active: boolean }) {
  const col = sev === 'danger' ? '#FF3B3B' : sev === 'warning' ? '#F5A623' : '#00FF88'
  return (
    <span
      className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
      style={{ background: col, boxShadow: active ? `0 0 6px ${col}` : 'none' }}
    />
  )
}

export function EventLog({ entries, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeCells = useRef<Map<string, HTMLSpanElement>>(new Map())

  useEffect(() => {
    timeRef.current = setInterval(() => {
      timeCells.current.forEach((el, id) => {
        const entry = entries.find(e => e.id === id)
        if (entry && el) el.textContent = timeAgo(entry.timestamp)
      })
    }, 1000)
    return () => { if (timeRef.current) clearInterval(timeRef.current) }
  }, [entries])

  return (
    <motion.div
      initial={{ x: 288 }}
      animate={{ x: 0 }}
      exit={{ x: 288 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className="absolute right-0 top-0 bottom-0 w-72 bg-secondary border-l border-border flex flex-col z-20"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
          <span className="font-mono-data text-xs font-semibold text-amber uppercase tracking-widest">
            Event Log
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-textsecondary hover:text-textprimary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Count badge */}
      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        <span className="font-mono-data text-xs text-textsecondary">
          {entries.length} event{entries.length !== 1 ? 's' : ''} recorded
        </span>
      </div>

      {/* Scrollable list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {entries.map((entry, i) => {
            const isActive = entry.status === 'active'
            const col = entry.severity === 'danger' ? '#FF3B3B' : entry.severity === 'warning' ? '#F5A623' : '#00FF88'

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i === 0 ? 0 : 0 }}
                className="flex items-start gap-3 px-4 py-3 border-b border-border"
              >
                <SeverityDot sev={entry.severity} active={isActive} />

                <div className="min-w-0 flex-1">
                  <p className="text-textprimary text-sm font-medium leading-tight truncate">
                    {entry.title}
                  </p>
                  <p className="text-textsecondary text-xs mt-0.5 leading-snug line-clamp-2">
                    {entry.detail}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      ref={el => {
                        if (el) timeCells.current.set(entry.id, el)
                        else timeCells.current.delete(entry.id)
                      }}
                      className="text-muted text-xs font-mono-data"
                    >
                      {timeAgo(entry.timestamp)}
                    </span>

                    <span
                      className="text-xs font-mono-data px-2 py-0.5 rounded-sm"
                      style={
                        isActive
                          ? { background: 'rgba(255,59,59,0.15)', border: '1px solid rgba(255,59,59,0.4)', color: '#FF3B3B' }
                          : { background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', color: '#00FF88' }
                      }
                    >
                      {isActive ? 'ACTIVE' : 'RESOLVED'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <span className="text-textsecondary text-xs font-mono-data">No events yet</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
