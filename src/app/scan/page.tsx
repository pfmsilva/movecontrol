"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { CheckpointDTO } from "@/lib/types";
import QRScanner from "@/components/QRScanner";
import { formatDateTime } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

interface ScanResult {
  id: string;
  hostname: string;
  checkpointName: string;
  timestamp: string;
  ok: boolean;
  message?: string;
}

const LS_CHECKPOINT = "movecontrol.scan.checkpointId";

export default function ScanPage() {
  const { data: session } = useSession();
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [checkpointId, setCheckpointId] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [busy, setBusy] = useState(false);

  const isValidator = session?.user.role === "VALIDATOR";
  const allowedIds = useMemo(
    () => new Set(session?.user.validatorCheckpointIds ?? []),
    [session?.user.validatorCheckpointIds]
  );

  // Um VALIDATOR só vê/pode escolher os checkpoints que lhe foram associados.
  const availableCheckpoints = useMemo(
    () => (isValidator ? checkpoints.filter((c) => allowedIds.has(c.id)) : checkpoints),
    [checkpoints, isValidator, allowedIds]
  );

  useEffect(() => {
    fetch("/api/checkpoints")
      .then((r) => r.json())
      .then((cps: CheckpointDTO[]) => {
        setCheckpoints(cps);
      });
  }, []);

  useEffect(() => {
    if (checkpointId && !availableCheckpoints.some((c) => c.id === checkpointId)) {
      setCheckpointId("");
    }
    if (!checkpointId && availableCheckpoints.length > 0) {
      const saved = localStorage.getItem(LS_CHECKPOINT);
      const savedValid = saved && availableCheckpoints.some((c) => c.id === saved);
      setCheckpointId(savedValid ? saved! : availableCheckpoints[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCheckpoints]);

  useEffect(() => {
    if (checkpointId) localStorage.setItem(LS_CHECKPOINT, checkpointId);
  }, [checkpointId]);

  const canScan = Boolean(checkpointId);

  async function handleScan(hostname: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, checkpointId }),
      });
      const data = await res.json();
      const checkpointName = checkpoints.find((c) => c.id === checkpointId)?.name ?? "";

      if (!res.ok) {
        setResults((prev) => [
          {
            id: `${Date.now()}`,
            hostname,
            checkpointName,
            timestamp: new Date().toISOString(),
            ok: false,
            message: data.error ?? "Erro ao registar o scan.",
          },
          ...prev,
        ]);
      } else {
        setResults((prev) => [
          {
            id: data.id,
            hostname: data.equipment.hostname,
            checkpointName: data.checkpoint.name,
            timestamp: data.timestamp,
            ok: true,
          },
          ...prev,
        ]);
        if (navigator.vibrate) navigator.vibrate(80);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Scan de Equipamento</h1>
        <p className="text-sm text-gray-500">
          Seleciona o checkpoint atual e aponta a câmara ao QR Code do equipamento.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Ponto de Controlo Atual *</label>
          <select
            value={checkpointId}
            onChange={(e) => setCheckpointId(e.target.value)}
            disabled={scannerActive}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50"
          >
            {availableCheckpoints.length === 0 && <option value="">Nenhum checkpoint disponível</option>}
            {availableCheckpoints.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.order}. {cp.name}
              </option>
            ))}
          </select>
          {isValidator && availableCheckpoints.length === 0 && (
            <p className="mt-1 text-xs text-red-600">
              Não tens nenhum checkpoint associado. Contacta um administrador.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Utilizador Responsável</label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="font-medium">{session?.user.name}</span>
            {session?.user.role && (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 ring-1 ring-gray-200">
                {ROLE_LABELS[session.user.role]}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {!scannerActive ? (
          <button
            disabled={!canScan}
            onClick={() => setScannerActive(true)}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canScan ? "Ativar Câmara e Iniciar Scan" : "Seleciona um checkpoint"}
          </button>
        ) : (
          <div className="space-y-3">
            <QRScanner active={scannerActive} onScan={handleScan} />
            <button
              onClick={() => setScannerActive(false)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Parar Scanner
            </button>
            {busy && <p className="text-center text-xs text-gray-400">A registar scan…</p>}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Scans desta sessão</h2>
          <ul className="space-y-2">
            {results.map((r) => (
              <li
                key={r.id}
                className={`rounded-xl border p-3 text-sm shadow-sm ${
                  r.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">{r.hostname}</p>
                  <time className="text-xs text-gray-400">{formatDateTime(r.timestamp)}</time>
                </div>
                {r.ok ? (
                  <p className="text-xs text-gray-600">{r.checkpointName}</p>
                ) : (
                  <p className="text-xs text-red-700">{r.message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
