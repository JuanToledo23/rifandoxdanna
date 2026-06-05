interface StatsCardsProps {
  vendidos: number
  disponibles: number
}

export function StatsCards({ vendidos, disponibles }: StatsCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3">
      <div className="rounded-xl border border-celebrate/20 bg-celebrate/5 p-3 sm:p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-celebrate/80">
          Vendidos
        </div>
        <div className="font-display text-2xl font-bold text-celebrate sm:text-3xl">
          {vendidos}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Disponibles
        </div>
        <div className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {disponibles}
        </div>
      </div>
    </section>
  )
}
