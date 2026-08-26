"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { CheckpointDTO } from "@/lib/types";
import { canSetCheckpointManually } from "@/lib/permissions";

type Target = { hostname: string } | { palletCode: string };

export default function ManualCheckpointControl({ target }: { target: Target }) {
  const { data: session } = useSession();
  const canManage = canSetCheckpointManually(session?.user.role);
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [checkpointId, setCheckpointId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/checkpoints")
      .then((r) => r.json())
      .then((cps: CheckpointDTO[]) => setCheckpoints(cps));
  }, [canManage]);

  if (!canManage) return null;

  async function handleApply() {
    if (!checkpointId) return;
    const label = checkpoints.find((c) => c.id === checkpointId)?.name ?? "";
    if (!confirm(`Definir manualmente o checkpoint "${label}", sem passar por um scan físico do QR Code?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    const body = "hostname" in target ? { hostname: target.hostname, checkpointId, manual: true } : { palletCode: target.palletCode, checkpointId, manual: true };
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Não foi possível aplicar o checkpoint.");
      return;
    }
    // Navegação completa de propósito — mesmo motivo do fix do login/ficha:
    // router.refresh() deixava a página com dados desatualizados até um
    // reload manual, mesmo com a gravação já confirmada no servidor.
    window.location.reload();
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Definir Checkpoint Manualmente
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={checkpointId}
          onChange={(e) => setCheckpointId(e.target.value)}
          className="min-w-[220px] rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Seleciona um checkpoint…</option>
          {checkpoints.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.order}. {cp.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleApply}
          disabled={!checkpointId || saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "A aplicar…" : "Aplicar"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-[11px] text-amber-700">
        Fica registado no histórico como definido manualmente (sem scan físico do QR Code).
      </p>
    </div>
  );
}
