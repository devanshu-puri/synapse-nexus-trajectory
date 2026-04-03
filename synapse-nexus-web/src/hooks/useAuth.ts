'use client'

import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API = typeof window !== 'undefined' ? '/api/proxy' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

export function useAuth() {
  const { token, user, isAuthenticated, setAuth, clearAuth } = useAuthStore()

  async function signIn(email: string, password: string) {
    try {
      const res = await axios.post(`${API}/auth/signin`, { email, password })
      setAuth(res.data.token, res.data.user)
      return { success: true, role: res.data.user.role as string }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      return {
        success: false,
        error: axiosErr.response?.data?.detail || 'Invalid credentials',
      }
    }
  }

  async function signUp(
    name: string,
    email: string,
    password: string,
    role: 'driver' | 'engineer'
  ) {
    try {
      const res = await axios.post(`${API}/auth/signup`, {
        name,
        email,
        password,
        role,
      })
      setAuth(res.data.token, res.data.user)
      return { success: true, role: res.data.user.role as string }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      return {
        success: false,
        error: axiosErr.response?.data?.detail || 'Registration failed',
      }
    }
  }

  function signOut() {
    clearAuth()
  }

  return { token, user, isAuthenticated, signIn, signUp, signOut }
}
