'use client'

import type { Session } from '@/lib/types'

const STORAGE_KEY = 'session'

export function setSession(session: Session): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
