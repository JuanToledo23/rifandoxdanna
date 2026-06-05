'use client'

import { useEffect, useMemo, useState } from 'react'

import { BoletosGrid } from '@/components/BoletosGrid'
import { supabase } from '@/lib/supabase/client'
import type { Boleto } from '@/lib/types'

interface TooltipState {
  visible: boolean
  x: number
  y: number
  content: string
}

interface ToastState {
  visible: boolean
  content: string
}

const TOTAL = 300
const PRECIO = 100
const WHATSAPP_PHONE = '525533326744'
const WHATSAPP_DISPLAY = '55 3332 6744'
const WHATSAPP_MSG = 'Hola! Ya hice la transferencia de $100 para la rifa por Danna ❤️ Aquí va mi comprobante y el número que aparté.'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MSG)}`

const BANK_NAME = 'Banamex'
const BANK_HOLDER = 'Andrea Estrada Bustos'
const BANK_CLABE = '002180701832645494'

const SORTEO_INSTAGRAM = '@jandyy24'
const SORTEO_INSTAGRAM_URL = 'https://instagram.com/jandyy24'
const SORTEO_FECHA = '26 de junio de 2026'

const PREMIOS = [
  { medal: '🥇', name: 'Licuadora Ninja', detail: 'Profesional con pantalla táctil' },
  { medal: '🥈', name: 'Air Fryer Ninja Max XL', detail: '5.2L · Tecnología Max Crisp' },
  { medal: '🥉', name: 'Audífonos Sony', detail: 'Carga rápida · larga duración' },
]

function formatMxn(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

function shortName(full: string | null | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Comprador anónimo'
  if (parts.length === 1) return parts[0]
  // 3+ palabras: asume "Nombre [Segundo] Apellido…" → toma la 3ª como apellido
  // 2 palabras: "Nombre Apellido" → toma la 2ª
  const surnameIdx = parts.length >= 3 ? 2 : 1
  return `${parts[0]} ${parts[surnameIdx][0].toUpperCase()}.`
}

function formatComprador(b: Boleto): string {
  if (b.status === 'comprado') {
    return shortName(b.comprador_nombre)
  }
  return 'Disponible'
}

export default function PublicaPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  })
  const [toast, setToast] = useState<ToastState>({ visible: false, content: '' })
  const [clabeCopied, setClabeCopied] = useState(false)

  async function copyClabe() {
    try {
      await navigator.clipboard.writeText(BANK_CLABE)
      setClabeCopied(true)
      window.setTimeout(() => setClabeCopied(false), 1500)
    } catch {
      // ignore — usuario puede seleccionar el texto manualmente
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/boletos')
        const data = await res.json()
        if (!cancelled) {
          setBoletos(data.boletos ?? [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('boletos-rifa')
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
  }, [])

  const { vendidos, disponibles, pct } = useMemo(() => {
    const v = boletos.filter((b) => b.status === 'comprado').length
    const d = boletos.length - v
    const p = boletos.length ? Math.round((v / boletos.length) * 100) : 0
    return { vendidos: v, disponibles: d, pct: p }
  }, [boletos])

  function handleHover(b: Boleto, x: number, y: number) {
    setTooltip({ visible: true, x, y, content: formatComprador(b) })
  }

  function handleLeave() {
    setTooltip((t) => ({ ...t, visible: false }))
  }

  function handleTouch(b: Boleto) {
    setToast({ visible: true, content: `#${String(b.numero).padStart(3, '0')} · ${formatComprador(b)}` })
    window.setTimeout(() => setToast({ visible: false, content: '' }), 2000)
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-xl shadow-sm ring-1 ring-brand/20">
          💗
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-deep/80">
            Rifa solidaria
          </p>
          <h1 className="font-display text-xl font-bold leading-tight sm:text-2xl">
            Rifemos por Danna
          </h1>
        </div>
      </header>

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-foreground/80 sm:mb-8 sm:text-base">
        Danna necesita equipo especializado para su recuperación.{' '}
        <span className="font-medium text-foreground">Ayúdala con un boleto.</span>
      </p>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.2fr] lg:gap-10">
        <section className="space-y-5">
          <div className="rounded-3xl border bg-gradient-to-br from-brand-soft/70 via-card to-card p-5 shadow-sm sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-deep/80">
                Boletos vendidos
              </p>
              <p className="text-xs text-muted-foreground">{pct}%</p>
            </div>
            <p className="font-display mt-1 text-3xl font-bold leading-none text-brand-deep sm:text-4xl">
              {vendidos}<span className="text-foreground/40"> / {TOTAL}</span>
            </p>

            <div
              className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner"
              role="progressbar"
              aria-valuenow={vendidos}
              aria-valuemin={0}
              aria-valuemax={TOTAL}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-deep transition-all duration-700"
                style={{ width: `${(vendidos / TOTAL) * 100}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-celebrate">{vendidos}</span> vendidos ·{' '}
              <span className="font-semibold text-foreground">{disponibles}</span> disponibles
            </p>
          </div>

          <div className="rounded-2xl border bg-card/80 p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-bold sm:text-lg">Premios</h2>
              <span className="text-[11px] text-muted-foreground">{PREMIOS.length} ganadores</span>
            </div>
            <ul className="space-y-2.5">
              {PREMIOS.map((p) => (
                <li
                  key={p.name}
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/40 p-3"
                >
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {p.medal}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-semibold leading-tight">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card/80 p-5 sm:p-6">
            <h2 className="font-display text-base font-bold sm:text-lg">Cómo participar</h2>
            <ol className="mt-3 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-deep">
                  1
                </span>
                <span className="leading-relaxed text-foreground/85">
                  Elige tu número ({formatMxn(PRECIO)} c/u).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-deep">
                  2
                </span>
                <div className="min-w-0 flex-1">
                  <p className="leading-relaxed text-foreground/85">Transfiere {formatMxn(PRECIO)} a:</p>
                  <div className="mt-2 space-y-2 rounded-xl border border-border/70 bg-background/40 p-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Banco</p>
                      <p className="font-medium">{BANK_NAME}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Titular</p>
                      <p className="font-medium">{BANK_HOLDER}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CLABE</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs sm:text-sm">
                          {BANK_CLABE}
                        </code>
                        <button
                          type="button"
                          onClick={copyClabe}
                          className="shrink-0 rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand-deep transition hover:bg-brand/15 active:scale-95"
                          aria-label="Copiar CLABE"
                        >
                          {clabeCopied ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-deep">
                  3
                </span>
                <span className="leading-relaxed text-foreground/85">
                  Manda tu comprobante por WhatsApp con el número que escogiste.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-celebrate/20 text-xs font-bold text-celebrate">
                  ✓
                </span>
                <span className="leading-relaxed text-foreground/85">
                  ¡Listo! Tu número queda reservado 🎉
                </span>
              </li>
            </ol>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3.5 text-base font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-[#1ebe57] active:scale-[0.98]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
              </svg>
              Mandar comprobante por WhatsApp
              <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Respuesta rápida · {WHATSAPP_DISPLAY}
            </p>
          </div>

          <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/50 via-card to-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="text-2xl">📅</span>
              <div className="min-w-0">
                <p className="font-display font-semibold leading-tight">Sorteo en vivo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Por Instagram en{' '}
                  <a
                    href={SORTEO_INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-deep underline-offset-2 hover:underline"
                  >
                    {SORTEO_INSTAGRAM}
                  </a>
                </p>
                <p className="text-sm font-medium text-foreground">{SORTEO_FECHA}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="font-display text-lg font-bold sm:text-xl">Boletos</h2>
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

          <div className="rounded-2xl border bg-card/60 p-3 shadow-sm sm:p-4">
            {loading ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                Cargando boletos…
              </div>
            ) : (
              <BoletosGrid
                boletos={boletos}
                onCellHover={handleHover}
                onCellLeave={handleLeave}
                onCellTouch={handleTouch}
              />
            )}
          </div>
        </section>
      </div>

      {tooltip.visible && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md md:block"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
          }}
        >
          {tooltip.content}
        </div>
      )}

      {toast.visible && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[80%] rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg md:hidden"
        >
          {toast.content}
        </div>
      )}
    </main>
  )
}
