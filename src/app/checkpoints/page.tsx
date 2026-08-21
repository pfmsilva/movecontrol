"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { CheckpointDTO } from "@/lib/types";
import { canManageCheckpoints } from "@/lib/permissions";

export default function CheckpointsPage() {
  const { data: session } = useSession();
  const canManage = canManageCheckpoints(session?.user.role);
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", order: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/checkpoints", { cache: "no-store" });
    setCheckpoints(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/checkpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar checkpoint.");
      return;
    }
    setForm({ name: "", order: "", description: "" });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este checkpoint?")) return;
    const res = await fetch(`/api/checkpoints/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Não foi possível eliminar.");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Checkpoints</h1>
        <p className="text-sm text-gray-500">
          Pontos de controlo do processo de migração, por ordem. O checkpoint com maior ordem é considerado o estado
          &quot;Concluído&quot;.
        </p>
      </div>

      {canManage && (
      <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Nome *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ex: Chegada Datacenter Destino"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Ordem *</label>
          <input
            required
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Descrição</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "A guardar…" : "+ Adicionar Checkpoint"}
          </button>
        </div>
      </form>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">A carregar…</div>
      ) : (
        <ol className="space-y-2">
          {checkpoints.map((cp) => (
            <li
              key={cp.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {cp.order}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{cp.name}</p>
                  {cp.description && <p className="text-xs text-gray-500">{cp.description}</p>}
                </div>
              </div>
              {canManage && (
                <button onClick={() => handleDelete(cp.id)} className="text-xs font-medium text-red-600 hover:underline">
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
