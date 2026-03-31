'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mx-auto mb-4"
          />
          <p className="text-textsecondary font-mono-data text-sm">
            Verifying credentials...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
