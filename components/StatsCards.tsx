interface StatsCardsProps {
  vendidos: number
  disponibles: number
}

export function StatsCards({ vendidos, disponibles }: StatsCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3">
      <div className="rounded-xl border-2 border-celebrate/30 bg-celebrate/5 p-3 sm:p-4">
        <div className="text-[11px] font-bold uppercase tracking-wide text-celebrate">
          Vendidos
        </div>
        <div className="font-display text-2xl font-black text-celebrate sm:text-3xl">
          {vendidos}
        </div>
      </div>
      <div className="rounded-xl border-2 border-purple/20 bg-purple-soft/40 p-3 sm:p-4">
        <div className="text-[11px] font-bold uppercase tracking-wide text-purple-deep">
          Disponibles
        </div>
        <div className="font-display text-2xl font-black text-purple-deep sm:text-3xl">
          {disponibles}
        </div>
      </div>
    </section>
  )
}
