'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { getSession } from '@/lib/auth/get-session'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    router.replace(session ? (session.role === 'admin' ? '/admin' : '/vender') : '/login')
  }, [router])

  return (
    <main className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Cargando…
    </main>
  )
}
