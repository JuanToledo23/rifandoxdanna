'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setSession } from '@/lib/auth/set-session'
import type { Session } from '@/lib/types'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo iniciar sesión')
        return
      }
      const session = data as Session
      setSession(session)
      router.push(session.role === 'admin' ? '/admin' : '/vender')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-sm">
        <div className="polaroid polaroid-tilt-c rounded-3xl p-6 backdrop-blur sm:p-8">
          <div className="mb-6 text-center">
            <div aria-hidden="true" className="mb-3 text-4xl">💗</div>
            <h1 className="text-flyer font-display text-3xl font-black uppercase leading-tight sm:text-4xl">
              Rifamos por Danna
            </h1>
            <p className="banner-cream mt-3 inline-block rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide">
              Acceso para vendedores
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="tu@correo.com"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="btn-chunky h-12 w-full rounded-2xl bg-brand text-base font-bold text-white hover:bg-brand-deep disabled:bg-brand disabled:opacity-50"
              disabled={loading || !email || !password}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-wide text-purple-deep/70">
          Cada boleto suma para Danna 💗
        </p>
      </div>
    </main>
  )
}
