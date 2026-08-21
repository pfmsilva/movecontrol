"use client";

import { useEffect, useState } from "react";
import type { CheckpointDTO, UserDTO } from "@/lib/types";
import QRScanner from "@/components/QRScanner";
import { formatDateTime } from "@/lib/utils";

interface ScanResult {
  id: string;
  hostname: string;
  checkpointName: string;
  userName: string;
  timestamp: string;
  ok: boolean;
  message?: string;
}

const LS_CHECKPOINT = "movecontrol.scan.checkpointId";
const LS_USER = "movecontrol.scan.userId";

export default function ScanPage() {
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [checkpointId, setCheckpointId] = useState("");
  const [userId, setUserId] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/checkpoints").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([cps, us]) => {
      setCheckpoints(cps);
      setUsers(us);
      const savedCp = localStorage.getItem(LS_CHECKPOINT);
      const savedUser = localStorage.getItem(LS_USER);
      if (savedCp && cps.some((c: CheckpointDTO) => c.id === savedCp)) setCheckpointId(savedCp);
      else if (cps[0]) setCheckpointId(cps[0].id);
      if (savedUser && us.some((u: UserDTO) => u.id === savedUser)) setUserId(savedUser);
      else if (us[0]) setUserId(us[0].id);
    });
  }, []);

  useEffect(() => {
    if (checkpointId) localStorage.setItem(LS_CHECKPOINT, checkpointId);
  }, [checkpointId]);

  useEffect(() => {
    if (userId) localStorage.setItem(LS_USER, userId);
  }, [userId]);

  const canScan = Boolean(checkpointId && userId);

  async function handleScan(hostname: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, checkpointId, userId }),
      });
      const data = await res.json();
      const checkpointName = checkpoints.find((c) => c.id === checkpointId)?.name ?? "";
      const userName = users.find((u) => u.id === userId)?.name ?? "";

      if (!res.ok) {
        setResults((prev) => [
          {
            id: `${Date.now()}`,
            hostname,
            checkpointName,
            userName,
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
            userName: data.user.name,
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
          Seleciona o checkpoint e o responsável, depois aponta a câmara ao QR Code do equipamento.
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
            {checkpoints.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.order}. {cp.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Utilizador Responsável *</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={scannerActive}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {!scannerActive ? (
          <button
            disabled={!canScan}
            onClick={() => setScannerActive(true)}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canScan ? "Ativar Câmara e Iniciar Scan" : "Seleciona checkpoint e utilizador"}
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
                  <p className="text-xs text-gray-600">
                    {r.checkpointName} · registado por {r.userName}
                  </p>
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
