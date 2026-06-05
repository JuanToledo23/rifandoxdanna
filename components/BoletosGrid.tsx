'use client'

import type { Boleto } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BoletosGridProps {
  boletos: Boleto[]
  selectedNumero?: number | null
  interactive?: boolean
  onCellClick?: (boleto: Boleto) => void
  onCellHover?: (boleto: Boleto, x: number, y: number) => void
  onCellLeave?: () => void
  onCellTouch?: (boleto: Boleto) => void
}

const baseCell =
  'ticket-cell aspect-square rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center border transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background'

const stateClasses: Record<Boleto['status'], string> = {
  disponible:
    'bg-white/70 text-foreground/60 border-border hover:border-brand/60 hover:bg-brand-soft/40 hover:text-brand-deep',
  comprado:
    'bg-celebrate/10 text-celebrate border-celebrate/30 font-semibold cursor-default',
}

const selectedClasses: Record<Boleto['status'], string> = {
  disponible:
    'bg-brand text-white border-brand shadow-md shadow-brand/30 scale-[1.08] font-semibold',
  comprado:
    'bg-celebrate text-white border-celebrate shadow-md shadow-celebrate/30 scale-[1.08]',
}

export function BoletosGrid({
  boletos,
  selectedNumero,
  interactive = false,
  onCellClick,
  onCellHover,
  onCellLeave,
  onCellTouch,
}: BoletosGridProps) {
  return (
    <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
      {boletos.map((b) => {
        const isSelected = selectedNumero === b.numero
        const clickable = interactive && (b.status === 'disponible' || !!onCellClick)
        const isDisabled = !clickable && !onCellClick && !onCellHover
        return (
          <button
            key={b.numero}
            type="button"
            disabled={isDisabled}
            aria-pressed={isSelected || undefined}
            aria-label={`Boleto ${b.numero} ${b.status}`}
            onClick={onCellClick ? () => onCellClick(b) : undefined}
            onMouseMove={
              onCellHover
                ? (e) => onCellHover(b, e.clientX, e.clientY)
                : undefined
            }
            onMouseLeave={onCellLeave}
            onTouchStart={onCellTouch ? () => onCellTouch(b) : undefined}
            className={cn(
              baseCell,
              stateClasses[b.status],
              interactive &&
                b.status === 'disponible' &&
                'cursor-pointer active:scale-95',
              interactive && b.status === 'comprado' && 'cursor-pointer',
              isSelected && selectedClasses[b.status],
            )}
          >
            {b.numero}
          </button>
        )
      })}
    </div>
  )
}
