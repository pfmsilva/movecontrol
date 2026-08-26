"use client";

import { useState } from "react";
import type { CheckpointDTO } from "@/lib/types";

interface Props {
  count: number;
  itemLabel: string; // "equipamento(s)" ou "palete(s)"
  checkpoints: CheckpointDTO[];
  onApply: (checkpointId: string) => Promise<void>;
  onClear: () => void;
}

export default function BulkCheckpointBar({ count, itemLabel, checkpoints, onApply, onClear }: Props) {
  const [checkpointId, setCheckpointId] = useState("");
  const [applying, setApplying] = useState(false);

  if (count === 0) return null;

  async function handleApply() {
    if (!checkpointId) return;
    const label = checkpoints.find((c) => c.id === checkpointId)?.name ?? "";
    if (!confirm(`Definir manualmente o checkpoint "${label}" para ${count} ${itemLabel} selecionado(s)?`)) {
      return;
    }
    setApplying(true);
    try {
      await onApply(checkpointId);
      setCheckpointId("");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
      <p className="text-sm font-semibold text-amber-900">
        {count} {itemLabel} selecionado{count > 1 ? "s" : ""}
      </p>
      <select
        value={checkpointId}
        onChange={(e) => setCheckpointId(e.target.value)}
        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        <option value="">Definir checkpoint manualmente…</option>
        {checkpoints.map((cp) => (
          <option key={cp.id} value={cp.id}>
            {cp.order}. {cp.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleApply}
        disabled={!checkpointId || applying}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {applying ? "A aplicar…" : "Aplicar"}
      </button>
      <button
        onClick={onClear}
        disabled={applying}
        className="ml-auto text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
      >
        Limpar seleção
      </button>
    </div>
  );
}
