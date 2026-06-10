'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image, { type StaticImageData } from 'next/image'
import posthog from 'posthog-js'
import confetti from 'canvas-confetti'

import { BoletosGrid } from '@/components/BoletosGrid'
import { supabase } from '@/lib/supabase/client'
import type { Boleto } from '@/lib/types'

function getDevice(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  return window.matchMedia('(hover: none)').matches ? 'mobile' : 'desktop'
}

import licuadoraImg from '@/public/premios/licuadora.webp'
import airFryerImg from '@/public/premios/air-fryer.webp'
import audifonosImg from '@/public/premios/audifonos.jpg'

interface ToastState {
  visible: boolean
  content: string
}

const TOTAL = 350
const PRECIO = 100
const WHATSAPP_PHONE = '525533326744'
const WHATSAPP_DISPLAY = '55 3332 6744'
const WHATSAPP_MSG = 'Hola! Ya hice la transferencia de $100 para la rifa por Danna. Aquí va mi comprobante y el número que aparté.'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MSG)}`

function buildWhatsAppUrlForNumero(numero: number): string {
  const padded = String(numero).padStart(3, '0')
  const msg = `Hola! Quiero apartar el boleto #${padded} de la rifa por Danna. Adjunto mi comprobante de la transferencia de $100.`
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`
}

const BANK_NAME = 'Banamex'
const BANK_HOLDER = 'Andrea Estrada Bustos'
const BANK_CLABE = '002180701832645494'

const SORTEO_INSTAGRAM = '@jandyy24'
const SORTEO_INSTAGRAM_URL = 'https://instagram.com/jandyy24'
const SORTEO_FECHA = '26 de junio de 2026 · 6:00 PM'

const PREMIOS: Array<{
  medal: string
  name: string
  detail: string
  frame: string
  tilt: string
  labelColor: string
  image: StaticImageData
}> = [
  {
    medal: '🥇',
    name: 'Licuadora Ninja',
    detail: 'Profesional con pantalla táctil',
    frame: 'frame-yellow',
    tilt: 'polaroid-tilt-l',
    labelColor: 'text-brand-deep',
    image: licuadoraImg,
  },
  {
    medal: '🥈',
    name: 'Air Fryer Ninja Max XL',
    detail: '5.2L · Tecnología Max Crisp',
    frame: 'frame-cream',
    tilt: 'polaroid-tilt-c',
    labelColor: 'text-purple-deep',
    image: airFryerImg,
  },
  {
    medal: '🥉',
    name: 'Audífonos Sony',
    detail: 'Carga rápida · larga duración',
    frame: 'frame-pink',
    tilt: 'polaroid-tilt-r',
    labelColor: 'text-brand-deep',
    image: audifonosImg,
  },
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
  const [toast, setToast] = useState<ToastState>({ visible: false, content: '' })
  const [clabeCopied, setClabeCopied] = useState(false)
  const [selectedNumero, setSelectedNumero] = useState<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const confettiFiredRef = useRef(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedNumero(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function copyClabe(source: 'instructions' | 'modal') {
    try {
      await navigator.clipboard.writeText(BANK_CLABE)
      setClabeCopied(true)
      posthog.capture('clabe_copied', { source })
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
          const list: Boleto[] = data.boletos ?? []
          setBoletos(list)
          const vendidos = list.filter((b) => b.status === 'comprado').length
          posthog.capture('boletos_loaded', {
            vendidos,
            disponibles: list.length - vendidos,
            total: list.length,
          })
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

  useEffect(() => {
    if (confettiFiredRef.current) return
    if (loading || boletos.length === 0) return
    if (disponibles >= 100) return
    confettiFiredRef.current = true
    const duration = 3000
    const end = Date.now() + duration
    const colors = ['#E8734A', '#22C55E']
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [loading, boletos.length, disponibles])

  function showSoldToast(b: Boleto) {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast({
      visible: true,
      content: `#${String(b.numero).padStart(3, '0')} · ${formatComprador(b)}`,
    })
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ visible: false, content: '' })
      toastTimerRef.current = null
    }, 2000)
  }

  function handleCellClick(b: Boleto) {
    const device = getDevice()
    if (b.status === 'comprado') {
      showSoldToast(b)
      posthog.capture('boleto_sold_inspect', { numero: b.numero, device })
      return
    }
    if (b.status !== 'disponible') return
    posthog.capture('boleto_available_click', { numero: b.numero, device })
    posthog.capture('apartar_modal_opened', { numero: b.numero })
    setSelectedNumero(b.numero)
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 sm:pb-20">
      <header className="mb-4 flex flex-col items-center text-center sm:mb-6">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-deep ring-1 ring-brand/25 sm:text-[11px]">
          <span aria-hidden="true">💗</span>
        </span>
        <h1 className="text-flyer font-display text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          Rifamos por Danna
        </h1>
      </header>

      <div className="mb-7 flex justify-center sm:mb-9">
        <p className="banner-cream max-w-xl rounded-full px-5 py-2.5 text-center text-sm font-semibold uppercase tracking-wide sm:px-7 sm:py-3 sm:text-[15px]">
          Danna necesita equipo especializado para su recuperación. ¡Ayúdala con un boleto!
        </p>
      </div>

      {!loading && disponibles < 100 && (
        <div className="mb-7 rounded-2xl bg-green-50 px-5 py-4 text-center text-sm font-semibold text-green-900 ring-1 ring-green-200 sm:mb-9 sm:px-7 sm:py-5 sm:text-base">
          {disponibles === 0
            ? '🎉 ¡Meta cumplida! Gracias a todos los que apoyaron a Danna.'
            : `🎉 ¡Ya casi llegamos! Solo quedan ${disponibles} boletos para completar la meta de Danna.`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.2fr] lg:gap-10">
        <section className="space-y-5">
          <div className="frame-purple rounded-3xl p-3 polaroid-tilt-l">
            <div className="rounded-2xl bg-white p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-deep">
                Boletos vendidos
              </p>
              <p className="text-xs font-semibold text-purple-deep/80">{pct}%</p>
            </div>
            <p className="font-display mt-1 text-3xl font-black leading-none text-brand-deep sm:text-4xl">
              {vendidos}<span className="text-purple/50"> / {TOTAL}</span>
            </p>

            <div
              className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner ring-1 ring-purple/15"
              role="progressbar"
              aria-valuenow={vendidos}
              aria-valuemin={0}
              aria-valuemax={TOTAL}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand via-brand-deep to-purple transition-all duration-700"
                style={{ width: `${(vendidos / TOTAL) * 100}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-foreground/75">
              <span className="font-bold text-celebrate">{vendidos}</span> vendidos ·{' '}
              <span className="font-bold text-foreground">{disponibles}</span> disponibles
            </p>
            </div>
          </div>

          <div>
            <h2 className="text-flyer-purple font-display mb-5 text-center text-3xl font-black uppercase sm:text-4xl">
              Premios
            </h2>
            <ul className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
              {PREMIOS.map((p) => (
                <li key={p.name} className={`rounded-2xl p-3 pb-4 ${p.frame} ${p.tilt}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white shadow-inner lg:w-32 lg:shrink-0">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(min-width: 1024px) 8rem, (min-width: 640px) 33vw, 100vw"
                        className="object-contain p-2"
                        placeholder="blur"
                      />
                    </div>
                    <div className="min-w-0 flex-1 px-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl leading-none" aria-hidden="true">
                          {p.medal}
                        </span>
                        <p className={`font-display text-base font-black uppercase leading-tight tracking-tight sm:text-lg ${p.labelColor}`}>
                          {p.name}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-foreground/70 sm:text-sm">{p.detail}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="frame-cream polaroid-tilt-c rounded-3xl p-3">
            <div className="rounded-2xl bg-white p-5 sm:p-6">
              <h2 className="text-flyer-purple font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
                Cómo participar
              </h2>
            <ol className="mt-3 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-white shadow-sm shadow-brand/40">
                  1
                </span>
                <span className="leading-relaxed text-foreground/85">
                  Elige tu número ({formatMxn(PRECIO)} c/u).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple text-xs font-black text-white shadow-sm shadow-purple/40">
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
                          onClick={() => copyClabe('instructions')}
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-white shadow-sm shadow-brand/40">
                  3
                </span>
                <span className="leading-relaxed text-foreground/85">
                  Manda tu comprobante por WhatsApp con el número que escogiste.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-celebrate text-xs font-black text-white shadow-sm shadow-celebrate/40">
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
              onClick={() => posthog.capture('whatsapp_general_clicked')}
              className="btn-chunky group mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-5 py-3.5 text-base font-bold text-white transition hover:bg-[#1ebe57]"
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
          </div>

          <div className="frame-purple polaroid-tilt-r rounded-3xl p-3">
            <div className="rounded-2xl bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="text-2xl">📅</span>
              <div className="min-w-0">
                <p className="font-display text-base font-bold uppercase tracking-tight text-purple-deep">
                  Sorteo en vivo
                </p>
                <p className="mt-1 text-sm text-foreground/75">
                  Por Instagram en{' '}
                  <a
                    href={SORTEO_INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-purple underline-offset-2 hover:underline"
                  >
                    {SORTEO_INSTAGRAM}
                  </a>
                </p>
                <p className="text-sm font-semibold text-foreground">{SORTEO_FECHA}</p>
              </div>
            </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="text-flyer-purple font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Boletos
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-foreground/70 sm:text-xs">
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

          <div className="frame-purple rounded-3xl p-3">
            <div className="rounded-2xl bg-white p-3 sm:p-4">
            {loading ? (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                Cargando boletos…
              </div>
            ) : (
              <BoletosGrid
                boletos={boletos}
                interactive
                onCellClick={handleCellClick}
              />
            )}
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-between sm:gap-4 sm:px-6">
          <p className="text-center text-sm font-semibold text-foreground sm:text-left sm:text-base">
            Hago páginas web, apps y proyectos como este. ¿Te interesa? 👇
          </p>
          <a
            href="https://wa.me/527774939562?text=Hola%20Juan%2C%20vi%20la%20rifa%20de%20Danna%20y%20me%20interesa%20algo%20similar"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-chunky inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1ebe57] sm:w-auto sm:shrink-0"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
            </svg>
            Escríbeme por WhatsApp
          </a>
        </div>
      </div>

      {toast.visible && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[80%] rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg"
        >
          {toast.content}
        </div>
      )}

      {selectedNumero != null && (
        <>
          <div
            role="presentation"
            aria-hidden="true"
            onClick={() => setSelectedNumero(null)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Apartar boleto ${String(selectedNumero).padStart(3, '0')}`}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(28rem,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:p-7 md:pb-7 md:shadow-xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />

            <div className="flex flex-col items-center gap-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-purple-deep">
                Apartar boleto
              </span>
              <span
                aria-label={`Boleto ${String(selectedNumero).padStart(3, '0')}`}
                className="font-display rounded-full bg-brand-soft px-6 py-2 text-3xl font-black text-brand-deep shadow-sm ring-1 ring-brand/25"
              >
                #{String(selectedNumero).padStart(3, '0')}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-border/70 bg-background/50 p-4 text-sm leading-relaxed">
              <p className="font-medium text-foreground">¿Ya transferiste {formatMxn(PRECIO)}?</p>
              <p className="mt-1 text-xs text-foreground/70">
                <span className="font-semibold text-foreground">{BANK_NAME}</span> · {BANK_HOLDER}
              </p>
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CLABE</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs">
                    {BANK_CLABE}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyClabe('modal')}
                    className="shrink-0 rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand-deep transition hover:bg-brand/15 active:scale-95"
                    aria-label="Copiar CLABE"
                  >
                    {clabeCopied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-foreground/75">
                Al continuar abrimos WhatsApp con tu mensaje listo. Solo tendrás que{' '}
                <span className="font-semibold text-foreground">adjuntar tu comprobante</span> y enviar.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedNumero(null)}
                className="h-11 flex-1 rounded-xl text-sm font-semibold text-foreground/70 hover:bg-muted"
              >
                Cancelar
              </button>
              <a
                href={buildWhatsAppUrlForNumero(selectedNumero)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  posthog.capture('whatsapp_modal_clicked', { numero: selectedNumero })
                  setSelectedNumero(null)
                }}
                className="btn-chunky group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-white hover:bg-[#1ebe57]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
                </svg>
                Abrir WhatsApp
                <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
              </a>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
