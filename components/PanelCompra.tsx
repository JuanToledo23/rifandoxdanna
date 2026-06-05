'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Boleto } from '@/lib/types'

interface PanelCompraProps {
  numero: number
  token: string
  onSuccess: (boleto: Boleto) => void
  onCancel: () => void
  onSessionExpired?: () => void
}

export function PanelCompra({
  numero,
  token,
  onSuccess,
  onCancel,
  onSessionExpired,
}: PanelCompraProps) {
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const padded = String(numero).padStart(3, '0')
  const nombreOk = nombre.trim().length >= 2
  const telOk = tel.trim().length >= 6
  const canSubmit = nombreOk && telOk && !loading

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/boletos/comprar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          numero,
          comprador_nombre: nombre.trim(),
          comprador_tel: tel.trim(),
        }),
      })
      const data = await res.json()
      if (res.status === 401) {
        setError('Tu sesión expiró. Vuelve a iniciar sesión.')
        onSessionExpired?.()
        return
      }
      if (res.status === 409) {
        setError('Este número ya fue vendido, elige otro')
        return
      }
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo registrar la venta. Intenta de nuevo.')
        return
      }
      onSuccess(data.boleto as Boleto)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop — only on mobile */}
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onCancel}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
      />

      {/* Panel — fixed bottom sheet on mobile, inline card on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Vender boleto ${padded}`}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:static md:rounded-2xl md:border md:p-6 md:pb-6 md:shadow-sm"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />

        <div className="flex flex-col items-center gap-2 pt-1">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Vender boleto
          </span>
          <span
            aria-label={`Boleto ${padded}`}
            className="font-display rounded-full bg-brand-soft px-6 py-2 text-3xl font-bold text-brand-deep shadow-sm ring-1 ring-brand/20"
          >
            #{padded}
          </span>
          <p className="text-xs text-muted-foreground">$100 MXN · suma para Danna 💗</p>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-sm">
              Nombre del comprador
            </Label>
            <Input
              id="nombre"
              autoComplete="name"
              required
              minLength={2}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={loading}
              placeholder="Ej. María González"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tel" className="text-sm">
              Teléfono
            </Label>
            <Input
              id="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              minLength={6}
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              disabled={loading}
              placeholder="10 dígitos"
              className="h-11"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="h-11 flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 flex-1 bg-brand text-white hover:bg-brand-deep disabled:bg-brand disabled:opacity-50"
              disabled={!canSubmit}
            >
              {loading ? 'Vendiendo…' : 'Confirmar venta'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
