"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { PalletSummaryDTO } from "@/lib/types";
import { canManagePallets } from "@/lib/permissions";
import StatusBadge from "@/components/StatusBadge";

export default function PalletsPage() {
  const { data: session } = useSession();
  const canManage = canManagePallets(session?.user.role);
  const [pallets, setPallets] = useState<PalletSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/pallets", { cache: "no-store" });
    setPallets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/pallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar palete.");
      return;
    }
    setForm({ label: "", notes: "" });
    setFormOpen(false);
    load();
  }

  async function handleDelete(code: string) {
    if (!confirm(`Eliminar a palete "${code}"? Os equipamentos lá dentro não são afetados.`)) return;
    await fetch(`/api/pallets/${encodeURIComponent(code)}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Paletes</h1>
          <p className="text-sm text-gray-500">
            Agrupa vários equipamentos numa palete física — fazer scan do QR da palete regista o
            checkpoint para todos os equipamentos lá dentro de uma só vez.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {formOpen ? "Cancelar" : "+ Criar Palete"}
          </button>
        )}
      </div>

      {canManage && formOpen && (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Etiqueta / Descrição</label>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="ex: Rack R14 — Wave 3"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Notas</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "A criar…" : "Criar Palete"}
            </button>
            <p className="mt-2 text-xs text-gray-400">
              O código é gerado automaticamente (ex: PAL-0001). Adiciona equipamentos no detalhe da palete.
            </p>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">A carregar…</div>
      ) : pallets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Nenhuma palete criada.
        </div>
      ) : (
        <div className="scroll-thin overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Etiqueta</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Equipamentos</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pallets.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.code}</td>
                  <td className="px-4 py-3 text-gray-500">{p.label ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className="font-medium text-gray-700">{p.itemCount}</span>{" "}
                    {p.itemCount > 0 && (
                      <span className="text-xs text-gray-400">
                        ({p.hostnames.slice(0, 3).join(", ")}
                        {p.hostnames.length > 3 ? `, +${p.hostnames.length - 3}` : ""})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 whitespace-nowrap text-xs font-medium">
                      <Link href={`/pallets/${encodeURIComponent(p.code)}`} className="text-brand-600 hover:underline">
                        Detalhe
                      </Link>
                      <Link href={`/pallets/${encodeURIComponent(p.code)}/print`} className="text-brand-600 hover:underline">
                        Imprimir QR
                      </Link>
                      {canManage && (
                        <button onClick={() => handleDelete(p.code)} className="text-red-600 hover:underline">
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
