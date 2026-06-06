'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { BoletosGrid } from '@/components/BoletosGrid'
import { PanelCompra } from '@/components/PanelCompra'
import { PanelInfo } from '@/components/PanelInfo'
import { StatsCards } from '@/components/StatsCards'
import { Button } from '@/components/ui/button'
import { clearSession } from '@/lib/auth/set-session'
import { getSession } from '@/lib/auth/get-session'
import { supabase } from '@/lib/supabase/client'
import type { Boleto, Session } from '@/lib/types'

const TOTAL = 350
const PRECIO = 100

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export default function VenderPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<Session | null>(null)
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) {
      router.replace('/login')
      return
    }
    setSessionState(s)
  }, [router])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/boletos')
        if (!res.ok) throw new Error('http')
        const data = await res.json()
        if (!cancelled) {
          setBoletos(data.boletos ?? [])
          setLoadError(null)
        }
      } catch {
        if (!cancelled) setLoadError('No se pudieron cargar los boletos. Revisa tu conexión.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('boletos-vender')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boletos' },
        (payload) => {
          const next = payload.new as Boleto
          if (!next?.numero) return
          setBoletos((prev) => prev.map((b) => (b.numero === next.numero ? next : b)))
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  const { vendidos, disponibles } = useMemo(() => {
    const v = boletos.filter((b) => b.status === 'comprado').length
    return { vendidos: v, disponibles: boletos.length - v }
  }, [boletos])

  const selectedBoleto = useMemo(
    () => (selected != null ? boletos.find((b) => b.numero === selected) ?? null : null),
    [selected, boletos],
  )

  const handleCellClick = useCallback((b: Boleto) => {
    setSelected((curr) => (curr === b.numero ? null : b.numero))
  }, [])

  const handleSuccess = useCallback((b: Boleto) => {
    setBoletos((prev) => prev.map((x) => (x.numero === b.numero ? b : x)))
    setSelected(null)
    const padded = String(b.numero).padStart(3, '0')
    const name = b.comprador_nombre ?? ''
    setSuccessMsg(`✓ Boleto #${padded} vendido — ${name}`)
    window.setTimeout(() => setSuccessMsg(null), 3000)
  }, [])

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

  function onSessionExpired() {
    clearSession()
    router.replace('/login')
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
      <header className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand font-display text-base font-black text-white shadow-sm shadow-brand/40"
          >
            {initials(session.name) || '💗'}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-deep">
              {session.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </p>
            <h1 className="font-display truncate text-lg font-bold leading-tight sm:text-xl">
              {session.name}
            </h1>
            <p className="truncate text-xs text-foreground/65">{session.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLogout}
          disabled={loggingOut}
          className="shrink-0 border-purple/30 font-semibold text-purple-deep hover:bg-purple-soft"
        >
          {loggingOut ? 'Saliendo…' : 'Salir'}
        </Button>
      </header>

      {successMsg && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-celebrate/30 bg-celebrate/10 px-4 py-2.5 text-sm font-medium text-celebrate"
        >
          {successMsg}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-start md:gap-6">
        <section className="space-y-4">
          <StatsCards vendidos={vendidos} disponibles={disponibles} />

          <div className="frame-purple rounded-3xl p-3">
            <div className="rounded-2xl bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-flyer-purple font-display text-xl font-black uppercase tracking-tight sm:text-2xl">
                Boletos
              </h2>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground sm:text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-white ring-1 ring-border" />
                  Libre
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-celebrate" />
                  Comprado
                </span>
              </div>
            </div>

            {loading && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                Cargando boletos…
              </div>
            )}
            {!loading && loadError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {loadError}
              </div>
            )}
            {!loading && !loadError && (
              <BoletosGrid
                boletos={boletos}
                interactive
                selectedNumero={selected}
                onCellClick={handleCellClick}
              />
            )}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            {TOTAL} boletos · ${PRECIO} c/u
          </p>
        </section>

        <aside className="md:sticky md:top-6">
          {!selectedBoleto && (
            <div className="hidden md:block">
              <div className="frame-cream polaroid-tilt-c rounded-3xl p-3">
                <div className="rounded-2xl bg-white p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-2xl text-white shadow-sm shadow-brand/40">
                    💗
                  </div>
                  <p className="font-display text-base font-bold uppercase tracking-tight text-purple-deep">
                    Selecciona un boleto
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    Toca cualquier número del grid para venderlo o ver su info.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedBoleto?.status === 'disponible' && (
            <PanelCompra
              numero={selectedBoleto.numero}
              token={session.token}
              onSuccess={handleSuccess}
              onCancel={() => setSelected(null)}
              onSessionExpired={onSessionExpired}
            />
          )}

          {selectedBoleto?.status === 'comprado' && (
            <PanelInfo boleto={selectedBoleto} onClose={() => setSelected(null)} />
          )}
        </aside>
      </div>
    </main>
  )
}
