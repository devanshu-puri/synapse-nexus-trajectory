'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActiveAlert } from '@/types/simulation'

interface Props {
  alert: ActiveAlert | null
}

export function AlertOverlay({ alert }: Props) {
  const startRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ttcRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!alert?.ttc) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    startRef.current = performance.now()
    const initial = alert.ttc

    intervalRef.current = setInterval(() => {
      if (!ttcRef.current) return
      const elapsed = (performance.now() - startRef.current) / 1000
      const remaining = Math.max(0, initial - elapsed)
      ttcRef.current.textContent = remaining.toFixed(1) + 's'
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [alert?.id])

  const isDanger = alert?.severity === 'danger'
  const borderColor = isDanger ? 'rgba(255,59,59,0.8)' : 'rgba(245,166,35,0.8)'
  const bgColor = isDanger ? 'rgba(255,59,59,0.12)' : 'rgba(245,166,35,0.1)'

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.id}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 min-w-[320px] max-w-[520px]"
          style={{ pointerEvents: 'none' }}
        >
          <motion.div
            animate={isDanger ? { boxShadow: ['0 0 0px rgba(255,59,59,0)', '0 0 20px rgba(255,59,59,0.6)', '0 0 0px rgba(255,59,59,0)'] } : {}}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{ background: bgColor, border: `2px solid ${borderColor}`, backdropFilter: 'blur(12px)' }}
            className="rounded-sm px-5 py-3"
          >
            {/* Title row */}
            <div className="flex items-center gap-3">
              <span
                className="font-clash text-base font-semibold tracking-wide"
                style={{ color: isDanger ? '#FF3B3B' : '#F5A623' }}
              >
                {alert.title}
              </span>
              {alert.ttc !== null && (
                <span
                  ref={ttcRef}
                  className="font-mono-data text-xl font-bold ml-auto"
                  style={{ color: isDanger ? '#FF3B3B' : '#F5A623' }}
                >
                  {alert.ttc.toFixed(1)}s
                </span>
              )}
            </div>

            {/* Detail row */}
            <p className="text-textsecondary text-xs font-mono-data mt-1">
              {alert.detail}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
