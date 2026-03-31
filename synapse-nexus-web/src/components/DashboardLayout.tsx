'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'

interface DashboardLayoutProps {
  children: ReactNode
}

const driverLinks = [
  { href: '/dashboard/user', label: 'Navigation', icon: 'path' },
  { href: '/dashboard/user/alerts', label: 'Active Alerts', icon: 'alert' },
  { href: '/dashboard/user/routes', label: 'Saved Routes', icon: 'route' },
  { href: '/dashboard/user/settings', label: 'Settings', icon: 'settings' }
]

const engineerLinks = [
  { href: '/dashboard/engineer', label: 'Live Metrics', icon: 'metrics' },
  { href: '/dashboard/engineer/architecture', label: 'Model Architecture', icon: 'model' },
  { href: '/dashboard/engineer/debug', label: 'Prediction Debug', icon: 'debug' },
  { href: '/dashboard/engineer/training', label: 'Training History', icon: 'training' },
  { href: '/dashboard/engineer/settings', label: 'Settings', icon: 'settings' }
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [viewMode, setViewMode] = useState<'driver' | 'engineer'>('driver')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.05)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const isEngineerView = pathname.includes('/engineer')
  const links = viewMode === 'driver' ? driverLinks : engineerLinks

  const handleSignOut = () => {
    clearAuth()
    router.push('/auth')
  }

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'path':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        )
      case 'alert':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
      case 'route':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.187 16.94a4.5 4.5 0 01-8.374-2.04l2.95-6.426a1.5 1.5 0 012.74-.47l4.688 2.426a1.5 1.5 0 01.47 2.74l-2.95 6.426a4.5 4.5 0 01-8.374 2.04z" />
          </svg>
        )
      case 'settings':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'metrics':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        )
      case 'model':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
          </svg>
        )
      case 'debug':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'training':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Top Nav */}
      <nav className="h-14 bg-secondary/90 backdrop-blur-md border-b border-border flex items-center px-6 justify-between fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
            <span className="font-clash text-amber text-lg tracking-widest">SYNAPSE NEXUS</span>
          </Link>
        </div>

        <div className="flex items-center bg-elevated rounded-full p-1">
          <button
            onClick={() => setViewMode('driver')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              viewMode === 'driver'
                ? 'bg-amber text-primary'
                : 'text-textsecondary hover:text-textprimary'
            }`}
          >
            Driver View
          </button>
          <button
            onClick={() => setViewMode('engineer')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              viewMode === 'engineer'
                ? 'bg-amber text-primary'
                : 'text-textsecondary hover:text-textprimary'
            }`}
          >
            Engineer View
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green' : 'bg-red'}`} />
            <span className="text-textsecondary text-xs font-mono-data">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
          <span className="text-textprimary text-sm font-medium">
             {user?.name || 'User'}
          </span>
          <button
            onClick={handleSignOut}
            className="text-textsecondary hover:text-amber text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-14 bottom-0 bg-secondary border-r border-border transition-all duration-300 z-40 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-elevated border border-border rounded-full flex items-center justify-center text-textsecondary hover:text-textprimary transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <nav className="pt-6 px-3">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-sm transition-all ${
                  isActive
                    ? 'bg-amber/10 border-l-2 border-amber text-amber'
                    : 'text-textsecondary hover:text-textprimary hover:bg-elevated'
                }`}
              >
                <span className={isActive ? 'text-amber' : ''}>
                  {getIcon(link.icon)}
                </span>
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{link.label}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 mt-14 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
