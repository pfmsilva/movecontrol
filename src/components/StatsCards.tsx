import type { StatsDTO } from "@/lib/types";

export default function StatsCards({ stats }: { stats: StatsDTO }) {
  const cards = [
    { label: "Total de Equipamentos", value: stats.total, sub: null, color: "text-gray-900" },
    { label: "Pendentes", value: stats.pending, sub: `${stats.pendingPct}%`, color: "text-gray-600" },
    { label: "Em Trânsito", value: stats.inTransit, sub: `${stats.inTransitPct}%`, color: "text-amber-600" },
    { label: "Concluídos", value: stats.completed, sub: `${stats.completedPct}%`, color: "text-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">{c.label}</p>
          <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
          {c.sub && <p className="text-xs text-gray-400">{c.sub}</p>}
        </div>
      ))}

      <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:col-span-4">
        <p className="mb-2 text-xs font-medium text-gray-500">Progresso Global da Migração</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${stats.completedPct}%` }}
            title={`Concluído: ${stats.completedPct}%`}
          />
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${stats.inTransitPct}%` }}
            title={`Em trânsito: ${stats.inTransitPct}%`}
          />
          <div
            className="h-full bg-gray-300 transition-all"
            style={{ width: `${stats.pendingPct}%` }}
            title={`Pendente: ${stats.pendingPct}%`}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Concluído ({stats.completedPct}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Em trânsito ({stats.inTransitPct}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-300" /> Pendente ({stats.pendingPct}%)
          </span>
        </div>
      </div>
    </div>
  );
}
