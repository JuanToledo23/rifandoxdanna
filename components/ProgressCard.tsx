interface ProgressCardProps {
  vendidos: number
  total: number
  precio: number
  goalMxn: number
}

function formatMxn(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

export function ProgressCard({ vendidos, total, precio, goalMxn }: ProgressCardProps) {
  const recaudado = vendidos * precio
  const pctGoal = goalMxn > 0 ? Math.min(100, Math.round((recaudado / goalMxn) * 100)) : 0
  const pctBoletos = total > 0 ? (vendidos / total) * 100 : 0
  const restante = Math.max(0, goalMxn - recaudado)

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-brand-soft/60 via-card to-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-deep/80">
            Recaudado para Danna
          </p>
          <p className="font-display mt-1 text-4xl font-bold text-brand-deep sm:text-5xl">
            {formatMxn(recaudado)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="font-display text-lg font-semibold text-foreground">
            {formatMxn(goalMxn)}
          </p>
        </div>
      </div>

      <div
        className="mt-5 h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner"
        role="progressbar"
        aria-valuenow={vendidos}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-deep transition-all duration-700"
          style={{ width: `${pctBoletos}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{vendidos}</span> de {total} boletos vendidos
        </span>
        <span>
          {pctGoal}% · faltan{' '}
          <span className="font-semibold text-foreground">{formatMxn(restante)}</span>
        </span>
      </div>
    </section>
  )
}
