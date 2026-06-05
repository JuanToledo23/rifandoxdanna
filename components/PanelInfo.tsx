'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import type { Boleto } from '@/lib/types'

interface PanelInfoProps {
  boleto: Boleto
  onClose: () => void
}

export function PanelInfo({ boleto, onClose }: PanelInfoProps) {
  const padded = String(boleto.numero).padStart(3, '0')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Boleto ${padded} vendido`}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:static md:rounded-2xl md:border md:p-6 md:pb-6 md:shadow-sm"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />

        <div className="flex flex-col items-center gap-2 pt-1">
          <span className="text-[11px] uppercase tracking-[0.18em] text-celebrate">
            Boleto vendido
          </span>
          <span
            aria-label={`Boleto ${padded}`}
            className="font-display rounded-full bg-celebrate/10 px-6 py-2 text-3xl font-bold text-celebrate shadow-sm ring-1 ring-celebrate/20"
          >
            #{padded}
          </span>
          <p className="text-xs text-muted-foreground">¡Gracias por tu apoyo!</p>
        </div>

        <dl className="mt-5 divide-y rounded-xl border bg-background/40">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Comprador
            </dt>
            <dd className="truncate text-right text-sm font-medium">
              {boleto.comprador_nombre ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Teléfono
            </dt>
            <dd className="truncate text-right text-sm font-medium">
              {boleto.comprador_tel ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Vendido por
            </dt>
            <dd className="truncate text-right text-sm font-medium">
              {boleto.vendedor_email ?? '—'}
            </dd>
          </div>
        </dl>

        <Button
          type="button"
          variant="outline"
          className="mt-5 h-11 w-full"
          onClick={onClose}
        >
          Cerrar
        </Button>
      </div>
    </>
  )
}
