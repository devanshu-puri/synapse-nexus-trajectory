'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import NavBar from '@/components/NavBar'
import BEVCanvas from '@/components/BEVCanvas'

// ─── Animation Variants ────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
}

// ─── CountUp Component ─────────────────────────────────────────
function CountUp({
  end,
  suffix = '',
  prefix = '',
  duration = 1.8,
  decimals = 0,
  color = 'text-[#F5A623]',
  className = '',
}: {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
  color?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    const steps = 60
    const stepDuration = (duration * 1000) / steps
    let current = 0
    const increment = end / steps
    const timer = setInterval(() => {
      current += increment
      if (current >= end) {
        setValue(end)
        clearInterval(timer)
      } else {
        setValue(current)
      }
    }, stepDuration)
    return () => clearInterval(timer)
  }, [inView, end, duration])

  return (
    <span ref={ref} className={`${color} ${className}`}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  )
}

// ─── Comparison Table Data ─────────────────────────────────────
const tableRows = [
  ['Prediction Type', 'Occupancy Grid', 'Joint Agent', 'Rule-Based', 'Intent-First ★'],
  ['Social Context', '✗', '✓ Partial', '✗', '✓ Cross-Attention'],
  ['Hardware Required', 'Vision Array', 'LiDAR $75k+', 'Camera', 'Camera + Map Only'],
  ['Pedestrian Intent', '✗', '✗ Partial', '✗', '✓ 4-Class Gate'],
  ['Edge / Offline', '✗ Partial', '✗', '✓', '✓ ONNX <20ms'],
  ['Multi-Modal K=3', '✗', '✓', '✗', '✓'],
  ['Driver Explainability', '✗', '✗', '✗', '✓ Luna + UI'],
]

// ─── Architecture Nodes ────────────────────────────────────────
const archNodes = [
  { label: 'Agent History  4 × 6', novel: false },
  { label: 'GRU Encoder', novel: false },
  { label: 'Social Attention ★', novel: true },
  { label: 'Map CNN  3×100×100', novel: false },
  { label: 'Context Fusion', novel: false },
  { label: 'Intent Classifier ★', novel: true },
  { label: 'Goal Predictor  K=3', novel: false },
  { label: 'GRU Decoder × 3', novel: false },
  { label: 'Occupancy Scorer ★', novel: true },
  { label: '3 Trajectories + Intent', novel: true, highlight: true },
]

// ─── Metric Cards ─────────────────────────────────────────────
const metricCards = [
  { value: '0.298', label: 'minADE_3', desc: 'Avg displacement error', trend: '↓ lower is better', end: 0.298, decimals: 3 },
  { value: '0.491', label: 'minFDE_3', desc: 'Final position error', trend: '↓ lower is better', end: 0.491, decimals: 3 },
  { value: '0.041', label: 'MissRate_2_3', desc: 'Prediction miss rate', trend: '↓ better', end: 0.041, decimals: 3 },
  { value: '0.020', label: 'OffRoadRate', desc: 'Off-road predictions', trend: '↓ better', end: 0.020, decimals: 3 },
]

// ─── How It Works Steps ───────────────────────────────────────
const steps = [
  {
    num: 1,
    title: '2 Seconds of Motion',
    desc: 'Position, velocity, and heading captured at 2Hz for every agent within 30 metres.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="5" r="1.5" />
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
        <path d="M5 6.5V10.5M6.5 12H10.5M12 13.5V17.5" />
      </svg>
    ),
  },
  {
    num: 2,
    title: 'Crowd Dynamics Computed',
    desc: 'Cross-attention over up to 10 neighbours. The model learns who avoids whom.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" />
        <line x1="12" y1="4" x2="12" y2="10" />
        <line x1="12" y1="14" x2="12" y2="20" />
        <line x1="4" y1="12" x2="10" y2="12" />
        <line x1="14" y1="12" x2="20" y2="12" />
      </svg>
    ),
  },
  {
    num: 3,
    title: 'Intent Gate Activated',
    desc: 'Before predicting WHERE, we predict WHY. Cross road? Continue? Stop? Turn?',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19L12 8" />
        <path d="M12 8L16 14" />
        <path d="M12 8L8 14" />
        <circle cx="16" cy="17" r="2" />
        <circle cx="8" cy="17" r="2" />
      </svg>
    ),
  },
  {
    num: 4,
    title: '3 Futures Generated',
    desc: 'A goal-conditioned GRU decoder produces 3 confidence-weighted trajectory hypotheses.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20C6 14 9 11 12 10" />
        <path d="M12 10C13 7 16 5 19 4" />
        <path d="M12 10C12 7 13 5 14 4" />
        <path d="M12 10C11 7 9 6 7 5" />
      </svg>
    ),
  },
  {
    num: 5,
    title: 'Occupancy Re-Ranked',
    desc: 'Physically impossible paths are penalised. The safest plausible trajectory wins.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L20 7V13C20 17 16.5 20.5 12 22C7.5 20.5 4 17 4 13V7L12 3Z" />
        <path d="M9 12L11 14L15 10" />
      </svg>
    ),
  },
]

// ─── Tech Badges ──────────────────────────────────────────────
const techBadges = [
  'nuScenes Trained',
  'Social Attention',
  'Goal-Conditioned GRU',
  'ONNX Edge Export',
  'Intent-First Pipeline',
  'Map-Compliant Loss',
]

// ─── Main Page ────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#080B14', color: '#E8EDF5' }}>
      <NavBar />

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: HERO
      ═══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: '100vh', backgroundColor: '#080B14' }}
      >
        {/* BEV Canvas */}
        <BEVCanvas opacity={0.35} />

        {/* Content */}
        <div
          className="relative z-10 flex flex-col items-center justify-center text-center px-4"
          style={{ minHeight: '100vh', paddingTop: '60px' }}
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 border px-4 py-1.5 mb-8"
            style={{
              borderColor: 'rgba(245,166,35,0.3)',
              backgroundColor: 'rgba(245,166,35,0.05)',
            }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#00FF88' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span
              className="text-sm uppercase tracking-widest"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#F5A623',
              }}
            >
              LIVE — Intent-First Trajectory Prediction
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mb-6"
          >
            <div
              className="leading-none mb-2"
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                fontWeight: 600,
                lineHeight: 1.05,
              }}
            >
              {["We", "don't", "react", "to"].map((word, i) => (
                <motion.span key={i} variants={fadeUp} className="inline-block mr-4">
                  {word}
                </motion.span>
              ))}
            </div>
            <div
              className="leading-none"
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                fontWeight: 600,
                lineHeight: 1.05,
              }}
            >
              {['where', 'they', 'are.'].map((word, i) => (
                <motion.span key={i} variants={fadeUp} className="inline-block mr-4">
                  {word}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="text-xl max-w-2xl mx-auto mb-8"
            style={{
              color: '#8892A4',
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.6,
            }}
          >
            We predict where they&apos;ll be. 3 seconds ahead.
            <br />
            With confidence. In any urban environment.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-4 justify-center mb-12"
          >
            <Link
              href="/auth"
              className="font-semibold px-8 py-3 text-base transition-all duration-200 hover:brightness-110"
              style={{
                fontFamily: "'Clash Display', sans-serif",
                backgroundColor: '#F5A623',
                color: '#080B14',
              }}
            >
              Try the Platform →
            </Link>
            <button
              onClick={() => {
                const el = document.getElementById('how-it-works')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-8 py-3 text-base transition-all duration-200 hover:bg-amber-500/10 bg-transparent cursor-pointer"
              style={{
                border: '1px solid rgba(245,166,35,0.4)',
                color: '#F5A623',
              }}
            >
              See How It Works
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
          >
            {[
              { num: '< 20ms', label: 'Inference Latency' },
              { num: '3s', label: 'Prediction Window' },
              { num: 'K=3', label: 'Trajectory Modes' },
            ].map((stat, i) => (
              <div key={stat.label} className="contents">
                <div className="flex flex-col items-center">
                  <span
                    className="text-4xl font-bold"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#F5A623',
                    }}
                  >
                    {stat.num}
                  </span>
                  <span
                    className="text-xs uppercase tracking-widest mt-1"
                    style={{ color: '#8892A4' }}
                  >
                    {stat.label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className="hidden md:block h-12 w-px self-center"
                    style={{ backgroundColor: '#1E2535' }}
                  />
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: PROBLEM STRIP
      ═══════════════════════════════════════════════════════ */}
      <section
        id="problem"
        className="border-y py-16 px-4"
        style={{ backgroundColor: '#0D1117', borderColor: '#1E2535' }}
      >
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12"
        >
          {[
            {
              end: 0.3,
              decimals: 1,
              suffix: 's',
              color: 'text-[#FF3B3B]',
              label: 'Human reaction time to a pedestrian stepping out',
            },
            {
              end: 3,
              decimals: 0,
              suffix: 's',
              color: 'text-[#F5A623]',
              label: 'How far ahead Synapse Nexus predicts their path',
            },
            {
              end: 87,
              decimals: 0,
              suffix: '%',
              color: 'text-[#00FF88]',
              label: 'Top-mode prediction accuracy on nuScenes benchmark',
            },
          ].map((stat, i) => (
            <div key={stat.label} className="contents">
              <motion.div
                variants={fadeUp}
                className="flex-1 text-center px-4"
              >
                <div
                  className="text-6xl font-bold mb-3"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <CountUp
                    end={stat.end}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                    color={stat.color}
                  />
                </div>
                <p
                  className="text-sm leading-relaxed max-w-xs mx-auto"
                  style={{ color: '#8892A4' }}
                >
                  {stat.label}
                </p>
              </motion.div>
              {i < 2 && (
                <div
                  className="hidden md:block h-24 w-px flex-shrink-0"
                  style={{ backgroundColor: '#1E2535' }}
                />
              )}
            </div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="py-24 px-4"
        style={{ backgroundColor: '#080B14' }}
      >
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <p
            className="text-xs uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5A623' }}
          >
            PROCESS
          </p>
          <h2
            className="mb-3"
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              color: '#E8EDF5',
            }}
          >
            How The Prediction Works
          </h2>
          <p className="text-lg" style={{ color: '#8892A4' }}>
            Five stages. Under 20 milliseconds. Entirely on-device.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-6xl mx-auto relative">
          {/* Connecting dashed line */}
          <div
            className="absolute hidden md:block"
            style={{
              top: '80px',
              left: '10%',
              right: '10%',
              height: 0,
              borderTop: '2px dashed rgba(245,166,35,0.3)',
              zIndex: 0,
            }}
          />

          <div className="flex flex-col md:flex-row gap-8 md:gap-0 overflow-x-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.15 }}
                className="flex-1 flex flex-col items-center text-center px-4 relative z-10 min-w-[160px]"
              >
                {/* Ghost number */}
                <div
                  className="absolute select-none pointer-events-none font-bold"
                  style={{
                    fontFamily: "'Clash Display', sans-serif",
                    fontSize: '5rem',
                    color: '#1E2535',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    lineHeight: 1,
                    zIndex: -1,
                  }}
                >
                  {step.num}
                </div>

                {/* Icon */}
                <div
                  className="w-12 h-12 border flex items-center justify-center mx-auto mb-4 transition-colors duration-300 cursor-default hover:border-[#F5A623]"
                  style={{
                    borderColor: '#1E2535',
                    backgroundColor: '#0D1117',
                    color: '#F5A623',
                  }}
                >
                  {step.icon}
                </div>

                <h3
                  className="font-semibold text-base mt-2 mb-2"
                  style={{ fontFamily: "'Clash Display', sans-serif", color: '#E8EDF5' }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed max-w-[200px]"
                  style={{ color: '#8892A4' }}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: TECH + METRICS
      ═══════════════════════════════════════════════════════ */}
      <section
        id="technology"
        className="py-24 px-4 border-y"
        style={{ backgroundColor: '#0D1117', borderColor: '#1E2535' }}
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
          {/* LEFT: Architecture */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5A623' }}
            >
              ARCHITECTURE
            </p>
            <h2
              className="text-3xl mb-6"
              style={{ fontFamily: "'Clash Display', sans-serif", color: '#E8EDF5' }}
            >
              Built on Real Science
            </h2>

            {/* Tech badges */}
            <div className="flex flex-wrap gap-2 mb-8">
              {techBadges.map((badge) => (
                <span
                  key={badge}
                  className="border text-xs px-3 py-1"
                  style={{
                    borderColor: '#1E2535',
                    color: '#8892A4',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>

            {/* Architecture flow */}
            <div className="space-y-2">
              {archNodes.map((node, i) => (
                <motion.div
                  key={node.label}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col"
                >
                  <div
                    className="px-4 py-2 text-sm w-full max-w-xs"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      backgroundColor: node.highlight ? 'rgba(245,166,35,0.05)' : '#161B27',
                      border: node.novel
                        ? '1px solid #F5A623'
                        : '1px solid #1E2535',
                      color: node.novel ? '#F5A623' : '#E8EDF5',
                    }}
                  >
                    {node.label}
                  </div>
                  {i < archNodes.length - 1 && (
                    <div
                      className="text-xs ml-4 leading-none"
                      style={{ color: '#F5A623' }}
                    >
                      ↓
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Metrics */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5A623' }}
            >
              PERFORMANCE
            </p>
            <h2
              className="text-3xl mb-2"
              style={{ fontFamily: "'Clash Display', sans-serif", color: '#E8EDF5' }}
            >
              Benchmark Results
            </h2>
            <p
              className="text-sm mb-8"
              style={{ color: '#8892A4' }}
            >
              nuScenes v1.0-mini validation split
            </p>

            <div className="grid grid-cols-2 gap-4">
              {metricCards.map((card) => (
                <div
                  key={card.label}
                  className="p-6 border transition-colors duration-300 hover:border-[#F5A623] cursor-default"
                  style={{ backgroundColor: '#161B27', borderColor: '#1E2535' }}
                >
                  <p
                    className="text-xs uppercase tracking-widest"
                    style={{ color: '#8892A4' }}
                  >
                    {card.label}
                  </p>
                  <div
                    className="text-5xl font-bold mt-2 mb-1"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#00FF88',
                    }}
                  >
                    <CountUp
                      end={card.end}
                      decimals={card.decimals}
                      color="text-[#00FF88]"
                      duration={2}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#4A5568' }}>
                    {card.desc}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#00FF88' }}
                  >
                    {card.trend}
                  </p>
                </div>
              ))}
            </div>

            {/* Hardware badge */}
            <div
              className="border px-4 py-2 mt-6 inline-block text-xs"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#00FF88',
                borderColor: 'rgba(0,255,136,0.3)',
                backgroundColor: '#161B27',
              }}
            >
              ✓&nbsp; Edge Deployable — 18ms avg on NVIDIA T4 — No Cloud Required
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: INDUSTRY COMPARISON
      ═══════════════════════════════════════════════════════ */}
      <section
        id="about"
        className="py-24 px-4"
        style={{ backgroundColor: '#080B14' }}
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <p
            className="text-xs uppercase tracking-widest mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5A623' }}
          >
            COMPETITIVE LANDSCAPE
          </p>
          <h2
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              color: '#E8EDF5',
            }}
          >
            How We Compare
          </h2>
        </motion.div>

        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-6xl mx-auto overflow-x-auto"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#0D1117', borderBottom: '1px solid #1E2535' }}>
                {['Feature', 'Tesla FSD', 'Waymo', 'Mobileye', 'Synapse Nexus'].map((h) => (
                  <th
                    key={h}
                    className="py-4 px-6 text-left text-xs uppercase tracking-widest"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: h === 'Synapse Nexus' ? '#F5A623' : '#8892A4',
                      borderBottom: h === 'Synapse Nexus' ? '2px solid #F5A623' : undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="transition-colors hover:bg-[#161B27]"
                  style={{ backgroundColor: ri % 2 === 0 ? '#0D1117' : '#080B14' }}
                >
                  {row.map((cell, ci) => {
                    const isSynapse = ci === 4
                    const isCheck = cell.startsWith('✓')
                    const isCross = cell.startsWith('✗')
                    return (
                      <td
                        key={ci}
                        className="py-4 px-6 text-sm border-b"
                        style={{
                          borderColor: '#1E2535',
                          color: isSynapse
                            ? '#E8EDF5'
                            : isCheck
                            ? '#00FF88'
                            : isCross
                            ? '#4A5568'
                            : '#8892A4',
                          fontWeight: isSynapse ? 500 : 400,
                        }}
                      >
                        {cell.includes('★') ? (
                          <>
                            {cell.replace('★', '')}{' '}
                            <span style={{ color: '#F5A623' }}>★</span>
                          </>
                        ) : (
                          cell
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p
            className="text-xs text-center mt-4"
            style={{ color: '#4A5568' }}
          >
            Analysis based on published research and product documentation.
          </p>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: CTA BANNER
      ═══════════════════════════════════════════════════════ */}
      <section
        className="border-y py-20 px-4 text-center"
        style={{ backgroundColor: '#0D1117', borderColor: '#1E2535' }}
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <h2
            className="mb-4"
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              color: '#E8EDF5',
            }}
          >
            Ready to see it live?
          </h2>
          <p
            className="text-lg mb-8 max-w-xl mx-auto"
            style={{ color: '#8892A4' }}
          >
            Sign up and watch the AI predict pedestrian trajectories in real-time.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth"
              className="font-semibold px-8 py-3 text-base transition-all duration-200 hover:brightness-110"
              style={{
                fontFamily: "'Clash Display', sans-serif",
                backgroundColor: '#F5A623',
                color: '#080B14',
              }}
            >
              Launch Platform →
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 text-base transition-all duration-200"
              style={{
                border: '1px solid #1E2535',
                color: '#8892A4',
              }}
            >
              View on GitHub
            </a>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7: FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer
        className="border-t py-8 px-8 flex flex-wrap justify-between items-center gap-4"
        style={{ backgroundColor: '#080B14', borderColor: '#1E2535' }}
      >
        <span
          className="text-sm"
          style={{ fontFamily: "'Clash Display', sans-serif", color: '#F5A623' }}
        >
          SYNAPSE NEXUS AI
        </span>
        <span
          className="text-xs"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8892A4' }}
        >
          Built for Harman Ignite Hackathon 2025
        </span>
        <span className="text-xs" style={{ color: '#4A5568' }}>
          Trajectory Intelligence Platform
        </span>
      </footer>
    </main>
  )
}
