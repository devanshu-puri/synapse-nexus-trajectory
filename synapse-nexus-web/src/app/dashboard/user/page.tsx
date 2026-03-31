'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useScenarioEngine } from '@/hooks/useScenarioEngine'
import { AlertOverlay } from '@/components/AlertOverlay'
import { EventLog } from '@/components/EventLog'
import { LunaButton } from '@/components/LunaButton'
import { SpeedGauge } from '@/components/SpeedGauge'

// Dynamically import canvas (client-only)
const DrivingCanvas = dynamic(() => import('@/components/DrivingCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-textsecondary text-xs font-mono-data">Initializing simulation…</p>
      </div>
    </div>
  ),
})

// Status icon component
function StatusIcon({ level }: { level: 'safe' | 'caution' | 'danger' }) {
  if (level === 'safe') {
    return (
      <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 10c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286z" />
      </svg>
    )
  }
  if (level === 'caution') {
    return (
      <svg className="w-5 h-5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

export default function UserDashboard() {
  const { state } = useScenarioEngine()
  const [logOpen, setLogOpen] = useState(false)

  const { ego, vehicles, activeAlert, alertHistory, lunaMessage, stats, dangerMode, screenFlash } = state

  // Determine overall status
  const hasDanger = vehicles.some(v => v.risk === 'danger') || dangerMode
  const hasWarning = vehicles.some(v => v.risk === 'warning') || !!activeAlert
  const statusLevel: 'safe' | 'caution' | 'danger' = hasDanger ? 'danger' : hasWarning ? 'caution' : 'safe'

  const statusLabel = { safe: 'SAFE', caution: 'CAUTION', danger: 'DANGER' }[statusLevel]
  const statusColor = { safe: '#00FF88', caution: '#F5A623', danger: '#FF3B3B' }[statusLevel]

  const unreviewed = alertHistory.filter(e => e.status === 'active').length

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-primary overflow-hidden">

      {/* ── Top Bar ──────────────────────────────────────────────────────────────── */}
      <div className="h-10 bg-secondary/90 border-b border-border flex items-center px-4 gap-4 flex-shrink-0 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-textsecondary hover:text-amber transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-clash text-xs text-amber tracking-widest">SYNAPSE NEXUS</span>
        </Link>

        <div className="h-4 w-px bg-border" />

        {/* Route */}
        <div className="flex items-center gap-2">
          <span className="font-mono-data text-xs text-textprimary">Onenorth</span>
          <svg className="w-3 h-3 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-mono-data text-xs text-textprimary">Queenstown</span>
        </div>

        <div className="h-4 w-px bg-border" />
        <span className="font-mono-data text-xs text-textsecondary">ETA 12 min | 4.2 km</span>

        <div className="ml-auto flex flex-col items-end gap-1 min-w-[200px]">
          <div className="flex items-center gap-3">
            <span
              className="font-mono-data text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-wider"
              style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', color: '#F5A623' }}
            >
              S{stats.scenarioIndex}/4 · {stats.scenarioName} · {stats.scenarioTimeRemaining}s remaining
            </span>
          </div>
          <div className="w-full h-[3px] bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-amber shadow-[0_0_8px_rgba(245,166,35,0.6)] transition-all duration-500"
              style={{ width: `${stats.scenarioProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Canvas Area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <DrivingCanvas state={state} />

        {/* ── Floating Left Mini Panel ─────────────────────────────────────────── */}
        <div
          className="absolute top-3 left-3 z-20 w-44 rounded-sm p-3"
          style={{ background: 'rgba(13,17,23,0.82)', border: '1px solid #1E2535', backdropFilter: 'blur(12px)' }}
        >
          <span className="font-clash text-xs text-amber tracking-widest block">SYNAPSE NEXUS AI</span>
          <div className="h-px bg-border my-2" />
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-mono-data text-[10px] text-textsecondary">Agents</span>
              <span className="font-mono-data text-[10px] text-textprimary">{stats.agentCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono-data text-[10px] text-textsecondary">Intent Acc.</span>
              <span className="font-mono-data text-[10px] text-green">{stats.intentAccuracy}%</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono-data text-[10px] text-textsecondary">Vehicles</span>
              <span className="font-mono-data text-[10px] text-textprimary">{vehicles.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono-data text-[10px] text-textsecondary">Events</span>
              <span className="font-mono-data text-[10px] text-amber">{alertHistory.length}</span>
            </div>
          </div>
        </div>

        {/* ── Luna Button (top right) ──────────────────────────────────────────── */}
        <div className="absolute top-3 right-3 z-20">
          <LunaButton message={lunaMessage} />
        </div>

        {/* ── Alert Overlay (top center of canvas) ────────────────────────────── */}
        <AlertOverlay alert={activeAlert} />

        {/* ── Scenario Intro Card (Framer Motion) ──────────────────────────────── */}
        <AnimatePresence>
          {state.showIntroCard && state.introCardData && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="bg-secondary/95 border border-amber/30 p-6 backdrop-blur-xl shadow-2xl">
                <span className="font-mono-data text-[10px] text-muted tracking-widest uppercase mb-1 block">
                  Scenario {state.introCardData.scenarioNumber} of 4
                </span>
                <h3 className="font-clash text-2xl text-amber mb-3 leading-none">
                  {state.introCardData.title}
                </h3>
                <p className="text-textsecondary text-sm leading-relaxed mb-4">
                  {state.introCardData.description}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-primary/50 relative overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3, ease: "linear" }}
                      className="absolute inset-y-0 left-0 bg-amber"
                    />
                  </div>
                  <span className="font-mono-data text-[10px] text-amber animate-pulse">STARTING...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Lane Info Panel (bottom left) ───────────────────────────────────── */}
        <div className="absolute bottom-6 left-6 z-30 w-56 bg-primary/85 border border-border p-3 backdrop-blur-md font-mono-data text-[10px]">
          <div className="mb-3">
            <span className="text-muted block mb-1">CURRENT LANE</span>
            <div className="flex items-center gap-2 text-textprimary">
              <span className="text-amber">●</span>
              <span className="text-xs uppercase font-bold">Lane 1 (Left)</span>
              <span className="ml-auto text-amber text-xs">↑</span>
            </div>
          </div>

          <div className="h-px bg-border my-2.5" />

          {state.stats.scenarioName !== 'Calm Driving' ? (
            <div>
              <span className="text-amber block mb-1 font-bold">SUGGESTED ACTION</span>
              <div className="flex flex-col gap-1">
                <span className="text-textprimary text-xs">→ {state.stats.scenarioName === 'Wrong Way Driver' ? 'Move to Lane 2' : 'Hold Lane'}</span>
                <span className="text-muted leading-tight">
                  {state.stats.scenarioName === 'Wrong Way Driver' 
                    ? 'Wrong-way vehicle in Lane 1 ahead. Pulsing alert active.'
                    : 'Monitoring surrounding traffic. No lane switch required.'
                  }
                </span>
                {state.stats.scenarioName === 'Wrong Way Driver' && (
                  <div className="mt-2 flex items-center justify-center py-2 bg-danger/5 border border-danger/20">
                     <span className="text-danger animate-pulse font-bold">SWITCH LANE →</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <span className="text-green block mb-1 font-bold italic">✓ ROUTE OPTIMAL</span>
              <span className="text-textsecondary">Continuing tracking in Lane 1. Zero immediate threats detected.</span>
            </div>
          )}
          
          <div className="h-px bg-border my-2.5" />
          
          <div className="space-y-1 text-muted uppercase tracking-tighter">
            <div className="flex justify-between"><span>Road</span><span>One North Ave 2</span></div>
            <div className="flex justify-between"><span>Limit</span><span>50 km/h</span></div>
            <div className="flex justify-between"><span>Traffic</span><span>Moderate</span></div>
          </div>
        </div>

        {/* ── Event Log Panel (slides from right) ─────────────────────────────── */}
        <AnimatePresence>
          {logOpen && (
            <EventLog entries={alertHistory} onClose={() => setLogOpen(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Status Bar ────────────────────────────────────────────────────── */}
      <div
        className="h-12 flex items-center px-5 gap-0 flex-shrink-0"
        style={{ background: '#0D1117', borderTop: '1px solid #1E2535' }}
      >
        {/* Instrument Cluster */}
        <div className="flex items-center gap-8 pl-4">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-mono-data text-5xl text-amber font-bold tracking-tighter">
                {ego.displaySpeed}
              </span>
              <span className="font-mono-data text-xs text-muted mb-1">km/h</span>
            </div>
            <div className="w-32 h-1.5 bg-primary relative overflow-hidden mt-1">
               <div 
                 className="absolute inset-y-0 left-0 bg-gradient-to-r from-green via-amber to-danger transition-all duration-500"
                 style={{ width: `${(ego.displaySpeed / 50) * 100}%` }}
               />
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex flex-col gap-1 font-mono-data">
            <div className="flex flex-col">
               <span className="text-[10px] text-muted leading-none capitalize">ODOMETER</span>
               <span className="text-sm text-textprimary tracking-wider leading-none">
                 {ego.odometer.toFixed(1).padStart(7, '0')} <span className="text-[10px] text-muted">km</span>
               </span>
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] text-muted leading-none">TRIP</span>
               <span className="text-sm text-amber tracking-wider leading-none">
                 {ego.trip.toFixed(1)} <span className="text-[10px] text-muted">km</span>
               </span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-border mx-4" />

        {/* Status Center */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <StatusIcon level={statusLevel} />
          <div className="flex flex-col">
            <span
              className="font-clash text-sm font-semibold leading-tight"
              style={{
                color: statusColor,
                animation: hasDanger ? 'pulse 1s infinite' : 'none',
              }}
            >
              {statusLabel}
            </span>
            <span className="font-mono-data text-[9px] text-textsecondary leading-tight">
              {stats.scenarioName}
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-border mx-4" />

        {/* Event Log Toggle */}
        <div className="flex-none">
          <button
            id="event-log-btn"
            onClick={() => setLogOpen(v => !v)}
            className="flex items-center gap-2 text-xs font-mono-data text-textsecondary hover:text-amber transition-colors px-3 py-1.5 border border-border hover:border-amber rounded-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            EVENT LOG
            {unreviewed > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#FF3B3B', color: '#FFFFFF' }}
              >
                {unreviewed}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
