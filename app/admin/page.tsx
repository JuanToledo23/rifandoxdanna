'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { LiberarBoleto } from '@/components/LiberarBoleto'
import { ProgressCard } from '@/components/ProgressCard'
import { StatsCards } from '@/components/StatsCards'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/auth/get-session'
import { clearSession } from '@/lib/auth/set-session'
import type { Session } from '@/lib/types'

const TOTAL = 300
const PRECIO = 100
const GOAL_MXN = 23000

interface VendorRow {
  id: string
  email: string
  name: string
  password_plain: string | null
}

interface VentaRow {
  numero: number
  comprador_nombre: string | null
  comprador_tel: string | null
  vendedor_email: string | null
  vendedor_name: string | null
  sold_at: string | null
}

interface DashboardData {
  vendedores: VendorRow[]
  ventas: VentaRow[]
  stats: { vendidos: number; disponibles: number; total_mxn: number }
}

export default function AdminPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<Session | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) {
      router.replace('/login')
      return
    }
    if (s.role !== 'admin') {
      router.replace('/vender')
      return
    }
    setSessionState(s)
  }, [router])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${session.token}` },
        })
        if (res.status === 401 || res.status === 403) {
          clearSession()
          router.replace('/login')
          return
        }
        const json = await res.json()
        if (!res.ok) {
          if (!cancelled) setError(json?.error ?? 'Error al cargar el panel')
          return
        }
        if (!cancelled) setData(json as DashboardData)
      } catch {
        if (!cancelled) setError('Error de conexión')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session, router])

  async function onLogout() {
    if (!session) return
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
    } catch {
      // ignore: clearing local session is enough
    } finally {
      clearSession()
      router.replace('/login')
    }
  }

  if (!session) {
    return (
      <main className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-xl ring-1 ring-brand/20">
            💗
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-deep/80">
              Panel admin
            </p>
            <h1 className="font-display text-lg font-bold leading-tight sm:text-xl">
              Rifa por Danna
            </h1>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Saliendo…' : 'Salir'}
        </Button>
      </header>

      {loading && (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          Cargando panel…
        </p>
      )}

      {error && !loading && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          <ProgressCard
            vendidos={data.stats.vendidos}
            total={TOTAL}
            precio={PRECIO}
            goalMxn={GOAL_MXN}
          />

          <StatsCards
            vendidos={data.stats.vendidos}
            disponibles={data.stats.disponibles}
          />

          <LiberarBoleto
            token={session.token}
            onLiberated={(boleto) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      ventas: prev.ventas.filter((v) => v.numero !== boleto.numero),
                      stats: {
                        ...prev.stats,
                        vendidos: Math.max(0, prev.stats.vendidos - 1),
                        disponibles: prev.stats.disponibles + 1,
                        total_mxn: Math.max(0, prev.stats.total_mxn - PRECIO),
                      },
                    }
                  : prev,
              )
            }}
            onSessionExpired={() => {
              clearSession()
              router.replace('/login')
            }}
          />

          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base font-bold sm:text-lg">
                  Vendedores
                </h2>
                <span className="text-xs text-muted-foreground">
                  {data.vendedores.length}
                </span>
              </div>
              <ul className="divide-y rounded-xl border bg-background/40">
                {data.vendedores.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Sin vendedores registrados
                  </li>
                )}
                {data.vendedores.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{v.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {v.email}
                      </div>
                    </div>
                    <code className="shrink-0 rounded-md border bg-muted px-2 py-1 font-mono text-xs">
                      {v.password_plain ?? '—'}
                    </code>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base font-bold sm:text-lg">
                  Boletos vendidos
                </h2>
                <span className="text-xs text-muted-foreground">
                  {data.ventas.length}/{TOTAL}
                </span>
              </div>
              <ul className="scrollbar-thin max-h-[28rem] divide-y overflow-y-auto rounded-xl border bg-background/40">
                {data.ventas.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aún no hay ventas
                  </li>
                )}
                {data.ventas.map((v) => (
                  <li
                    key={v.numero}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="font-display shrink-0 rounded-lg bg-celebrate/10 px-2.5 py-1 text-sm font-bold text-celebrate ring-1 ring-celebrate/30">
                      #{String(v.numero).padStart(3, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {v.comprador_nombre ?? '—'}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {v.comprador_tel ?? '—'}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] text-muted-foreground">
                      {v.vendedor_name ?? '—'}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </main>
  )
}
