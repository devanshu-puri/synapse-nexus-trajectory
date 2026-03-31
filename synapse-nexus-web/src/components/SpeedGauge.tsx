'use client'

import { useEffect, useRef } from 'react'

interface Props {
  speed: number        // current display speed (km/h)
  targetSpeed: number  // target (for colour cue)
  braking: boolean
}

export function SpeedGauge({ speed, targetSpeed, braking }: Props) {
  const displayRef = useRef<HTMLSpanElement>(null)
  const currentRef = useRef<number>(speed)

  useEffect(() => {
    let rafId: number
    const tick = () => {
      currentRef.current += (speed - currentRef.current) * 0.1
      if (displayRef.current) {
        displayRef.current.textContent = Math.round(currentRef.current).toString()
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [speed])

  const color = braking ? '#FF3B3B' : speed > 50 ? '#F5A623' : '#F5A623'

  return (
    <div className="flex flex-col items-start justify-center">
      <div className="flex items-baseline gap-1">
        <span
          ref={displayRef}
          className="font-mono-data text-4xl font-bold leading-none"
          style={{ color }}
        >
          {speed}
        </span>
        <span className="font-mono-data text-xs text-textsecondary leading-none mb-0.5">
          km/h
        </span>
      </div>
      {braking && (
        <span className="font-mono-data text-[9px] text-danger font-semibold uppercase tracking-widest mt-0.5 animate-pulse">
          BRAKING
        </span>
      )}
    </div>
  )
}
