"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { PalletDTO } from "@/lib/types";
import { canManagePallets } from "@/lib/permissions";
import StatusBadge from "@/components/StatusBadge";

export default function PalletItemsManager({ pallet: initial }: { pallet: PalletDTO }) {
  const { data: session } = useSession();
  const canManage = canManagePallets(session?.user.role);
  const [pallet, setPallet] = useState(initial);
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!hostname.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/pallets/${encodeURIComponent(pallet.code)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: hostname.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao adicionar equipamento.");
      return;
    }
    setPallet(data);
    setHostname("");
  }

  async function removeItem(h: string) {
    if (!confirm(`Remover "${h}" desta palete?`)) return;
    setBusy(true);
    const res = await fetch(`/api/pallets/${encodeURIComponent(pallet.code)}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: h }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) setPallet(data);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Equipamentos na Palete ({pallet.items.length})</h2>

      {canManage && (
        <form onSubmit={addItem} className="mb-4 flex gap-2">
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="Hostname do equipamento a adicionar"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={busy || !hostname.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {pallet.items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum equipamento nesta palete ainda.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {pallet.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href={`/equipment/${encodeURIComponent(item.hostname)}`}
                  className="truncate font-medium text-brand-600 hover:underline"
                >
                  {item.hostname}
                </Link>
                {item.model && <span className="truncate text-xs text-gray-400">{item.model}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={item.status} />
                {canManage && (
                  <button
                    onClick={() => removeItem(item.hostname)}
                    disabled={busy}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
