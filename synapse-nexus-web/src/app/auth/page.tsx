'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import BEVCanvas from '@/components/BEVCanvas'

// ─── SVG Icons ──────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function SteeringWheelIcon({ selected }: { selected: boolean }) {
  const color = selected ? '#F5A623' : '#8892A4'
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      {/* Outer ring */}
      <circle cx="16" cy="16" r="12" />
      {/* Inner hub */}
      <circle cx="16" cy="16" r="3" />
      {/* Spokes */}
      <line x1="16" y1="13" x2="16" y2="4" />
      <line x1="18.6" y1="18.5" x2="26.4" y2="23" />
      <line x1="13.4" y1="18.5" x2="5.6" y2="23" />
    </svg>
  )
}

function ChipIcon({ selected }: { selected: boolean }) {
  const color = selected ? '#F5A623' : '#8892A4'
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Main chip body */}
      <rect x="9" y="9" width="14" height="14" />
      {/* Top pins */}
      <line x1="12" y1="9" x2="12" y2="5" /><rect x="10.5" y="3.5" width="3" height="2" />
      <line x1="16" y1="9" x2="16" y2="5" /><rect x="14.5" y="3.5" width="3" height="2" />
      <line x1="20" y1="9" x2="20" y2="5" /><rect x="18.5" y="3.5" width="3" height="2" />
      {/* Bottom pins */}
      <line x1="12" y1="23" x2="12" y2="27" /><rect x="10.5" y="26.5" width="3" height="2" />
      <line x1="16" y1="23" x2="16" y2="27" /><rect x="14.5" y="26.5" width="3" height="2" />
      <line x1="20" y1="23" x2="20" y2="27" /><rect x="18.5" y="26.5" width="3" height="2" />
      {/* Left pins */}
      <line x1="9" y1="13" x2="5" y2="13" /><rect x="3.5" y="11.5" width="2" height="3" />
      <line x1="9" y1="19" x2="5" y2="19" /><rect x="3.5" y="17.5" width="2" height="3" />
      {/* Right pins */}
      <line x1="23" y1="13" x2="27" y2="13" /><rect x="26.5" y="11.5" width="2" height="3" />
      <line x1="23" y1="19" x2="27" y2="19" /><rect x="26.5" y="17.5" width="2" height="3" />
    </svg>
  )
}

// ─── Password Strength ───────────────────────────────────────────────────────

function getPasswordStrength(password: string): { level: number; label: string } {
  if (password.length === 0) return { level: 0, label: '' }
  if (password.length < 6) return { level: 1, label: 'Weak' }
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  if (password.length >= 8 && hasNumber && hasSymbol) return { level: 4, label: 'Strong' }
  if (password.length >= 8) return { level: 3, label: 'Good' }
  return { level: 2, label: 'Fair' }
}

const strengthColors: Record<number, string> = {
  1: '#FF3B3B',
  2: '#F5A623',
  3: '#F5A623',
  4: '#00FF88',
}

// ─── Shared Input Style ──────────────────────────────────────────────────────

const inputClass =
  'w-full bg-elevated border border-border text-textprimary px-4 py-3 text-sm focus:outline-none focus:border-amber placeholder:text-muted transition-colors duration-200'

// ─── Main Auth Page ──────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter()
  const { signIn, signUp, isAuthenticated } = useAuth()

  const [tab, setTab] = useState<'signin' | 'signup'>('signin')

  // Sign-in state
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [siShowPw, setSiShowPw] = useState(false)
  const [siError, setSiError] = useState('')
  const [siLoading, setSiLoading] = useState(false)

  // Sign-up state
  const [suName, setSuName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suConfirm, setSuConfirm] = useState('')
  const [suShowPw, setSuShowPw] = useState(false)
  const [suRole, setSuRole] = useState<'driver' | 'engineer' | ''>('')
  const [suError, setSuError] = useState('')
  const [suLoading, setSuLoading] = useState(false)

  const strength = getPasswordStrength(suPassword)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard/user')
  }, [isAuthenticated, router])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSignIn() {
    setSiError('')
    if (!siEmail.trim()) { setSiError('Email is required'); return }
    if (!siPassword) { setSiError('Password is required'); return }
    setSiLoading(true)
    const result = await signIn(siEmail, siPassword)
    setSiLoading(false)
    if (result.success) {
      router.push(result.role === 'engineer' ? '/dashboard/engineer' : '/dashboard/user')
    } else {
      setSiError(result.error || 'Invalid credentials')
    }
  }

  async function handleSignUp() {
    setSuError('')
    if (!suName.trim()) { setSuError('Full name is required'); return }
    if (!/\S+@\S+\.\S+/.test(suEmail)) { setSuError('Enter a valid email'); return }
    if (suPassword.length < 6) { setSuError('Password must be at least 6 characters'); return }
    if (suPassword !== suConfirm) { setSuError('Passwords do not match'); return }
    if (!suRole) { setSuError('Please select a role'); return }
    setSuLoading(true)
    const result = await signUp(suName, suEmail, suPassword, suRole as 'driver' | 'engineer')
    setSuLoading(false)
    if (result.success) {
      router.push(result.role === 'engineer' ? '/dashboard/engineer' : '/dashboard/user')
    } else {
      setSuError(result.error || 'Registration failed')
    }
  }

  // ── Animated underline for tabs ───────────────────────────────────────────
  const underlineVariants = {
    signin: { x: 0, width: 72 },
    signup: { x: 96, width: 72 },
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: BEV visualization panel ── */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden border-r border-border" style={{ background: '#0D1117' }}>
        <BEVCanvas opacity={0.4} />

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-48"
             style={{ background: 'linear-gradient(to top, #0D1117, transparent)' }} />

        {/* Content over canvas */}
        <div className="absolute bottom-8 left-8 right-8">
          {/* Metric pills */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'minADE: 0.298', color: '#00FF88' },
              { label: '3s prediction ahead', color: '#F5A623' },
              { label: 'K=3 trajectory modes', color: '#4A9EFF' },
            ].map((pill) => (
              <div
                key={pill.label}
                className="px-3 py-1.5 border border-border backdrop-blur-sm"
                style={{ background: 'rgba(8,11,20,0.8)', borderRadius: 0 }}
              >
                <span className="font-mono-data text-xs" style={{ color: pill.color }}>
                  {pill.label}
                </span>
              </div>
            ))}
          </div>

          {/* Headline */}
          <div className="mt-4">
            <p className="font-clash text-2xl text-textprimary leading-tight">
              Real-time trajectory prediction
            </p>
            <p className="font-clash text-2xl leading-tight" style={{ color: 'rgba(232,237,245,0.6)' }}>
              for autonomous urban mobility
            </p>
          </div>

          {/* Sub-label */}
          <p className="font-mono-data text-xs text-textsecondary mt-2">
            Powered by Social Attention + Intent-First GRU
          </p>
        </div>
      </div>

      {/* ── RIGHT: Auth form panel ── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-primary px-8 py-12">
        <div className="w-full max-w-md">

          {/* Logo / back link */}
          <Link
            href="/"
            className="font-clash text-amber text-lg mb-8 block hover:opacity-80 transition-opacity"
          >
            ← SYNAPSE NEXUS
          </Link>

          {/* Tab switcher */}
          <div className="flex mb-8 border-b border-border relative">
            <button
              id="tab-signin"
              onClick={() => { setTab('signin'); setSiError(''); setSuError('') }}
              className={`pb-3 px-1 mr-6 text-sm font-medium transition-colors duration-200 ${
                tab === 'signin' ? 'text-textprimary' : 'text-textsecondary hover:text-textprimary'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              onClick={() => { setTab('signup'); setSiError(''); setSuError('') }}
              className={`pb-3 px-1 text-sm font-medium transition-colors duration-200 ${
                tab === 'signup' ? 'text-textprimary' : 'text-textsecondary hover:text-textprimary'
              }`}
            >
              Sign Up
            </button>

            {/* Animated underline */}
            <motion.div
              className="absolute bottom-0 h-0.5 bg-amber"
              animate={underlineVariants[tab]}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          {/* ── Form container ── */}
          <AnimatePresence mode="wait">

            {/* SIGN IN FORM */}
            {tab === 'signin' && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Email */}
                <div className="mb-4">
                  <label className="block text-textsecondary text-xs uppercase tracking-widest font-mono-data mb-2">
                    Email Address
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    className={inputClass}
                    placeholder="you@example.com"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  />
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="block text-textsecondary text-xs uppercase tracking-widest font-mono-data mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signin-password"
                      type={siShowPw ? 'text' : 'password'}
                      className={`${inputClass} pr-12`}
                      placeholder="••••••••"
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                    />
                    <button
                      type="button"
                      onClick={() => setSiShowPw(!siShowPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textsecondary hover:text-textprimary transition-colors"
                    >
                      {siShowPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {siError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="font-mono-data text-sm px-4 py-3 mt-2"
                      style={{
                        background: 'rgba(255,59,59,0.1)',
                        border: '1px solid rgba(255,59,59,0.3)',
                        color: '#FF3B3B',
                      }}
                    >
                      {siError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sign In button */}
                <button
                  id="signin-btn"
                  onClick={handleSignIn}
                  disabled={siLoading}
                  className="w-full bg-amber text-primary font-clash font-semibold py-3 text-base mt-6 hover:brightness-110 transition-all duration-200 hover:amber-glow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {siLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-muted text-xs font-mono-data">or continue with</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Google button */}
                <button
                  id="google-signin-btn"
                  className="w-full border border-border text-textsecondary py-3 text-sm flex items-center justify-center gap-3 hover:border-brightborder hover:text-textprimary transition-all duration-200"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </motion.div>
            )}

            {/* SIGN UP FORM */}
            {tab === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Full Name */}
                <div className="mb-4">
                  <label className="block text-textsecondary text-xs uppercase tracking-widest font-mono-data mb-2">
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    className={inputClass}
                    placeholder="Jane Smith"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label className="block text-textsecondary text-xs uppercase tracking-widest font-mono-data mb-2">
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    className={inputClass}
                    placeholder="you@example.com"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="block text-textsecondary text-xs uppercase tracking-widest font-mono-data mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={suShowPw ? 'text' : 'password'}
                      className={`${inputClass} pr-12`}
                      placeholder="Min. 6 characters"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setSuShowPw(!suShowPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textsecondary hover:text-textprimary transition-colors"
                    >
                      {suShowPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {suPassword.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((seg) => (
                          <div
                            key={seg}
                            className="flex-1 h-1 rounded-sm transition-all duration-300"
                            style={{
                              background: seg <= strength.level
                                ? strengthColors[strength.level]
                                : '#1E2535',
                            }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-xs font-mono-data mt-1"
                        style={{ color: strengthColors[strength.level] || '#4A5568' }}
                      >
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label className="block text-textsecondary text-xs uppercase tracking-widest font-mono-data mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type="password"
                    className={inputClass}
                    placeholder="Repeat password"
                    value={suConfirm}
                    onChange={(e) => setSuConfirm(e.target.value)}
                  />
                </div>

                {/* Role selector */}
                <div className="mt-6 mb-4">
                  <label className="block text-textsecondary text-xs uppercase tracking-widest font-mono-data mb-3">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">

                    {/* Driver card */}
                    <div
                      id="role-driver"
                      onClick={() => setSuRole('driver')}
                      className="relative cursor-pointer border p-4 transition-all duration-200"
                      style={{
                        borderColor: suRole === 'driver' ? '#F5A623' : '#1E2535',
                        background: suRole === 'driver' ? 'rgba(245,166,35,0.05)' : '#161B27',
                        boxShadow: suRole === 'driver' ? '0 0 10px rgba(245,166,35,0.2)' : 'none',
                      }}
                    >
                      {suRole === 'driver' && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-green rounded-full" />
                      )}
                      <SteeringWheelIcon selected={suRole === 'driver'} />
                      <p
                        className="font-clash text-base mt-3"
                        style={{ color: suRole === 'driver' ? '#F5A623' : '#E8EDF5' }}
                      >
                        Driver
                      </p>
                      <p className="text-xs text-textsecondary mt-1">
                        Navigation + AI safety overlay
                      </p>
                    </div>

                    {/* Engineer card */}
                    <div
                      id="role-engineer"
                      onClick={() => setSuRole('engineer')}
                      className="relative cursor-pointer border p-4 transition-all duration-200"
                      style={{
                        borderColor: suRole === 'engineer' ? '#F5A623' : '#1E2535',
                        background: suRole === 'engineer' ? 'rgba(245,166,35,0.05)' : '#161B27',
                        boxShadow: suRole === 'engineer' ? '0 0 10px rgba(245,166,35,0.2)' : 'none',
                      }}
                    >
                      {suRole === 'engineer' && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-green rounded-full" />
                      )}
                      <ChipIcon selected={suRole === 'engineer'} />
                      <p
                        className="font-clash text-base mt-3"
                        style={{ color: suRole === 'engineer' ? '#F5A623' : '#E8EDF5' }}
                      >
                        Engineer
                      </p>
                      <p className="text-xs text-textsecondary mt-1">
                        Model internals + metrics
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {suError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="font-mono-data text-sm px-4 py-3 mt-2"
                      style={{
                        background: 'rgba(255,59,59,0.1)',
                        border: '1px solid rgba(255,59,59,0.3)',
                        color: '#FF3B3B',
                      }}
                    >
                      {suError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Create Account button */}
                <button
                  id="signup-btn"
                  onClick={handleSignUp}
                  disabled={suLoading}
                  className="w-full bg-amber text-primary font-clash font-semibold py-3 text-base mt-6 hover:brightness-110 transition-all duration-200 hover:amber-glow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {suLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>

                {/* Terms */}
                <p className="text-muted text-xs text-center mt-4">
                  By creating an account you agree to our Terms of Service
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
