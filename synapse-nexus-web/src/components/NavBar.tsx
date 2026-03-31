'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.header
      className="fixed top-0 left-0 w-full z-50 border-b border-[#1E2535] backdrop-blur-md"
      style={{ backgroundColor: scrolled ? '#080B14' : 'rgba(8,11,20,0.9)' }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between px-8 h-[60px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-[#00FF88]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span
            className="text-[#F5A623] tracking-widest text-sm font-semibold"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            SYNAPSE NEXUS
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8">
          {['About', 'How It Works', 'Technology'].map((item) => (
            <button
              key={item}
              onClick={() =>
                scrollTo(
                  item === 'How It Works'
                    ? 'how-it-works'
                    : item.toLowerCase().replace(/\s+/g, '-')
                )
              }
              className="text-[#8892A4] hover:text-[#E8EDF5] transition-colors duration-200 text-sm font-medium cursor-pointer bg-transparent border-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Right buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth"
            className="border border-[#1E2535] text-[#8892A4] px-4 py-1.5 text-sm hover:border-[#F5A623] hover:text-[#F5A623] transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/auth"
            className="bg-[#F5A623] text-[#080B14] font-semibold px-5 py-1.5 text-sm rounded-none hover:brightness-110 transition-all duration-200 hover:shadow-[0_0_10px_rgba(245,166,35,0.2)]"
          >
            Try Platform
          </Link>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-1"
          aria-label="Toggle menu"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="block w-6 h-px bg-[#E8EDF5]" />
          ))}
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0D1117] border-t border-[#1E2535] overflow-hidden"
          >
            <div className="flex flex-col gap-4 px-8 py-6">
              {['About', 'How It Works', 'Technology'].map((item) => (
                <button
                  key={item}
                  onClick={() =>
                    scrollTo(
                      item === 'How It Works'
                        ? 'how-it-works'
                        : item.toLowerCase().replace(/\s+/g, '-')
                    )
                  }
                  className="text-[#8892A4] text-sm font-medium text-left bg-transparent border-none cursor-pointer"
                >
                  {item}
                </button>
              ))}
              <div className="flex flex-col gap-3 pt-2 border-t border-[#1E2535]">
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="border border-[#1E2535] text-[#8892A4] px-4 py-2 text-sm text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="bg-[#F5A623] text-[#080B14] font-semibold px-5 py-2 text-sm text-center"
                >
                  Try Platform
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
