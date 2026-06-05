'use client'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Boleto } from '@/lib/types'

interface LiberarBoletoProps {
  token: string
  onLiberated?: (boleto: Boleto) => void
  onSessionExpired?: () => void
}

type Feedback =
  | { kind: 'idle' }
  | { kind: 'confirm'; numero: number }
  | { kind: 'success'; numero: number; nombre: string | null }
  | { kind: 'error'; message: string }

export function LiberarBoleto({
  token,
  onLiberated,
  onSessionExpired,
}: LiberarBoletoProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' })

  const numero = Number(value)
  const valid = Number.isInteger(numero) && numero >= 1 && numero <= 300

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || loading) return
    setFeedback({ kind: 'confirm', numero })
  }

  async function confirmLiberate(numeroToFree: number) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/liberar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ numero: numeroToFree }),
      })
      const data = await res.json()
      if (res.status === 401 || res.status === 403) {
        setFeedback({ kind: 'error', message: 'Sesión expirada o sin permiso' })
        onSessionExpired?.()
        return
      }
      if (res.status === 409) {
        setFeedback({ kind: 'error', message: 'Ese boleto no está vendido' })
        return
      }
      if (!res.ok) {
        setFeedback({
          kind: 'error',
          message: data?.error ?? 'No se pudo liberar',
        })
        return
      }
      const boleto = data.boleto as Boleto
      setFeedback({
        kind: 'success',
        numero: boleto.numero,
        nombre: boleto.comprador_nombre,
      })
      setValue('')
      onLiberated?.(boleto)
    } catch {
      setFeedback({ kind: 'error', message: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold sm:text-lg">
          Liberar boleto
        </h2>
        <span className="text-[11px] text-muted-foreground">solo admin</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Escribe el número de un boleto vendido para devolverlo a disponible.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={300}
          step={1}
          required
          placeholder="ej. 42"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (feedback.kind !== 'idle') setFeedback({ kind: 'idle' })
          }}
          disabled={loading}
          aria-label="Número de boleto a liberar"
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          disabled={!valid || loading}
          className="h-11 bg-brand text-white hover:bg-brand-deep disabled:bg-brand disabled:opacity-50"
        >
          Liberar
        </Button>
      </form>

      {feedback.kind === 'confirm' && (
        <div className="mt-3 rounded-xl border border-brand/30 bg-brand-soft/50 p-3">
          <p className="text-sm font-medium text-brand-deep">
            ¿Liberar el boleto #
            {String(feedback.numero).padStart(3, '0')}?
          </p>
          <p className="mt-0.5 text-xs text-foreground/70">
            Se borrará el comprador y volverá a estar disponible.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 flex-1"
              onClick={() => setFeedback({ kind: 'idle' })}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-9 flex-1 bg-brand text-white hover:bg-brand-deep disabled:bg-brand disabled:opacity-50"
              onClick={() => confirmLiberate(feedback.numero)}
              disabled={loading}
            >
              {loading ? 'Liberando…' : 'Sí, liberar'}
            </Button>
          </div>
        </div>
      )}

      {feedback.kind === 'success' && (
        <div
          role="status"
          className="mt-3 rounded-xl border border-celebrate/30 bg-celebrate/10 px-3 py-2 text-sm text-celebrate"
        >
          ✓ Boleto #{String(feedback.numero).padStart(3, '0')} liberado
          {feedback.nombre ? ` — era de ${feedback.nombre}` : ''}
        </div>
      )}

      {feedback.kind === 'error' && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {feedback.message}
        </div>
      )}
    </section>
  )
}
