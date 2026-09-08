"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { EquipmentDTO } from "@/lib/types";
import { canArchiveEquipment } from "@/lib/permissions";

export default function ArchivedEquipmentPage() {
  const { data: session, status } = useSession();
  const isAdmin = canArchiveEquipment(session?.user.role);
  const [equipment, setEquipment] = useState<EquipmentDTO[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/equipment?archived=true", { cache: "no-store" });
    setEquipment(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function handleRestore(hostname: string) {
    if (!confirm(`Restaurar o equipamento "${hostname}" para a listagem principal?`)) return;
    await fetch(`/api/equipment/${encodeURIComponent(hostname)}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    load();
  }

  async function handleDelete(hostname: string) {
    if (!confirm(`Eliminar definitivamente o equipamento "${hostname}" e todo o seu histórico? Esta ação não pode ser revertida.`))
      return;
    await fetch(`/api/equipment/${encodeURIComponent(hostname)}`, { method: "DELETE" });
    load();
  }

  if (status === "loading") {
    return <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">A carregar…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        Não tens permissão para aceder ao Arquivo.
      </div>
    );
  }

  const filtered = equipment.filter((eq) => eq.hostname.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Arquivo de Equipamentos</h1>
          <p className="text-sm text-gray-500">
            Equipamentos arquivados — não aparecem na listagem principal. Podes restaurá-los ou eliminá-los
            definitivamente da aplicação.
          </p>
        </div>
        <Link
          href="/equipment"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Voltar aos Equipamentos
        </Link>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar por nome/hostname…"
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">A carregar…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Nenhum equipamento arquivado.
        </div>
      ) : (
        <div className="scroll-thin overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Hostname</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Arquivado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((eq) => (
                <tr key={eq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{eq.hostname}</td>
                  <td className="px-4 py-3 text-gray-500">{eq.model ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {eq.archivedAt ? new Date(eq.archivedAt).toLocaleString("pt-PT") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 whitespace-nowrap text-xs font-medium">
                      <button onClick={() => handleRestore(eq.hostname)} className="text-brand-600 hover:underline">
                        Restaurar
                      </button>
                      <button onClick={() => handleDelete(eq.hostname)} className="text-red-600 hover:underline">
                        Eliminar definitivamente
                      </button>
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
