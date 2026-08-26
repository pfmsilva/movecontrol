"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { PalletDTO } from "@/lib/types";
import { canManagePallets } from "@/lib/permissions";
import StatusBadge from "@/components/StatusBadge";
import QRScanner from "@/components/QRScanner";
import { cx } from "@/lib/utils";

type ScanMode = "add" | "remove";

interface ScanLogEntry {
  id: string;
  hostname: string;
  mode: ScanMode;
  ok: boolean;
  message?: string;
}

export default function PalletItemsManager({ pallet: initial }: { pallet: PalletDTO }) {
  const { data: session } = useSession();
  const canManage = canManagePallets(session?.user.role);
  const [pallet, setPallet] = useState(initial);
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scannerActive, setScannerActive] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("add");
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);

  async function callApi(mode: ScanMode, h: string): Promise<{ ok: boolean; message?: string; data?: PalletDTO }> {
    const res = await fetch(`/api/pallets/${encodeURIComponent(pallet.code)}/items`, {
      method: mode === "add" ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: h }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.error ?? "Erro." };
    return { ok: true, data };
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!hostname.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await callApi("add", hostname.trim());
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Erro ao adicionar equipamento.");
      return;
    }
    setPallet(result.data!);
    setHostname("");
  }

  async function removeItem(h: string) {
    if (!confirm(`Remover "${h}" desta palete?`)) return;
    setBusy(true);
    const result = await callApi("remove", h);
    setBusy(false);
    if (result.ok) setPallet(result.data!);
  }

  // Leitura por câmara: cada QR de equipamento detetado é adicionado/removido
  // de imediato (sem passo de confirmação) — pensado para carregar/descarregar
  // a palete rapidamente, um scan a seguir ao outro.
  async function handleScanDetected(text: string) {
    if (text.startsWith("PALETE:")) {
      setScanLog((prev) => [
        { id: `${Date.now()}`, hostname: text.replace("PALETE:", ""), mode: scanMode, ok: false, message: "Isto é o QR de uma palete, não de um equipamento." },
        ...prev,
      ]);
      return;
    }
    const h = text.trim();
    const result = await callApi(scanMode, h);
    if (result.ok) setPallet(result.data!);
    setScanLog((prev) => [
      { id: `${Date.now()}`, hostname: h, mode: scanMode, ok: result.ok, message: result.message },
      ...prev,
    ]);
    if (result.ok && navigator.vibrate) navigator.vibrate(60);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Equipamentos na Palete ({pallet.items.length})</h2>

      {canManage && (
        <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-gray-300 bg-white p-1 text-sm">
              <button
                type="button"
                onClick={() => setScanMode("add")}
                disabled={scannerActive}
                className={cx(
                  "rounded-md px-3 py-1 font-medium disabled:cursor-not-allowed",
                  scanMode === "add" ? "bg-brand-600 text-white" : "text-gray-600"
                )}
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => setScanMode("remove")}
                disabled={scannerActive}
                className={cx(
                  "rounded-md px-3 py-1 font-medium disabled:cursor-not-allowed",
                  scanMode === "remove" ? "bg-red-600 text-white" : "text-gray-600"
                )}
              >
                Remover
              </button>
            </div>
            <button
              type="button"
              onClick={() => setScannerActive((v) => !v)}
              className={cx(
                "rounded-lg px-3 py-1.5 text-sm font-semibold text-white",
                scannerActive ? "bg-gray-600 hover:bg-gray-700" : "bg-brand-600 hover:bg-brand-700"
              )}
            >
              {scannerActive ? "Parar Câmara" : "Ativar Câmara (Scan)"}
            </button>
          </div>

          {scannerActive && (
            <div className="space-y-2">
              <p className="text-center text-xs text-gray-500">
                A ler QR Codes de equipamento para {scanMode === "add" ? "adicionar à" : "remover da"} palete…
              </p>
              <QRScanner active={scannerActive} onScan={handleScanDetected} />
            </div>
          )}

          {scanLog.length > 0 && (
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
              {scanLog.map((s) => (
                <li key={s.id} className={s.ok ? "text-emerald-700" : "text-red-700"}>
                  {s.ok
                    ? `${s.mode === "add" ? "Adicionado" : "Removido"}: ${s.hostname}`
                    : `${s.hostname}: ${s.message}`}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addItem} className="flex gap-2 border-t border-gray-200 pt-3">
            <input
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="Ou escreve o hostname manualmente"
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
        </div>
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
