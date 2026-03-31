'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/DashboardLayout'

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
      return
    }

    const isEngineer = pathname.includes('/engineer')
    const isDriver = pathname.includes('/user')

    if (user?.role === 'engineer' && isDriver) {
      router.push('/dashboard/engineer')
    } else if (user?.role === 'driver' && isEngineer) {
      router.push('/dashboard/user')
    }
  }, [isAuthenticated, user, pathname, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-textsecondary font-mono-data text-sm">
            Verifying credentials...
          </p>
        </div>
      </div>
    )
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
