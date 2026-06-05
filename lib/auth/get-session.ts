'use client'

import type { Session } from '@/lib/types'

const STORAGE_KEY = 'session'

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}
