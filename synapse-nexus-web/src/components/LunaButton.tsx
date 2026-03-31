'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  message: string
}

export function LunaButton({ message }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const prevMsgRef = useRef('')
  const barsRef = useRef<(HTMLDivElement | null)[]>([])

  // Watch for message changes → animate bars
  useEffect(() => {
    if (!message || message === prevMsgRef.current) return
    prevMsgRef.current = message
    if (!enabled) return

    setSpeaking(true)

    // Animate waveform bars
    let frameId: number
    const animBars = () => {
      barsRef.current.forEach(bar => {
        if (!bar) return
        const h = 4 + Math.random() * 14
        bar.style.height = `${h}px`
      })
      frameId = requestAnimationFrame(animBars)
    }
    frameId = requestAnimationFrame(animBars)

    // Stop when synthesis ends (approximate with message length)
    const estDuration = Math.max(2000, message.length * 55)
    const timer = setTimeout(() => {
      cancelAnimationFrame(frameId)
      barsRef.current.forEach(bar => { if (bar) bar.style.height = '4px' })
      setSpeaking(false)
    }, estDuration)

    return () => {
      cancelAnimationFrame(frameId)
      clearTimeout(timer)
    }
  }, [message, enabled])

  const handleToggle = () => {
    if (speaking) {
      window.speechSynthesis?.cancel()
      setSpeaking(false)
    }
    setEnabled(e => !e)
  }

  const truncated = message.length > 40 ? message.slice(0, 38) + '…' : message

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        id="luna-btn"
        onClick={handleToggle}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative"
        style={{
          background: '#0D1117',
          border: speaking ? '2px solid #F5A623' : '2px solid #1E2535',
          boxShadow: speaking ? '0 0 18px rgba(245,166,35,0.4)' : 'none',
        }}
        title={enabled ? 'Luna AI Voice (click to mute)' : 'Luna AI Voice (muted)'}
      >
        {/* Mic icon */}
        <svg
          className="w-5 h-5 transition-all"
          style={{
            color: speaking ? '#F5A623' : '#8892A4',
            transform: speaking ? 'scale(1.15)' : 'scale(1)',
          }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M19 10v2a7 7 0 0 1-14 0v-2M12 18v4M8 22h8" />
        </svg>

        {!enabled && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-primary/60">
            <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
            </svg>
          </div>
        )}
      </button>

      {/* Waveform bars */}
      <div className="flex items-center gap-0.5 h-5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            ref={el => { barsRef.current[i] = el }}
            className="w-1 rounded-full transition-all duration-100"
            style={{
              height: speaking ? '6px' : '3px',
              background: speaking ? '#F5A623' : '#2D3748',
            }}
          />
        ))}
      </div>

      {/* Last message */}
      {message && (
        <p className="text-xs font-mono-data text-muted text-center max-w-[100px] leading-tight">
          {truncated}
        </p>
      )}
    </div>
  )
}
