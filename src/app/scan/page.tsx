"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { CheckpointDTO, EquipmentDTO } from "@/lib/types";
import QRScanner from "@/components/QRScanner";
import StatusBadge from "@/components/StatusBadge";
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

/** Leitura do QR Code à espera de confirmação antes de gravar o scan. */
interface PendingScan {
  hostname: string;
  loading: boolean;
  equipment: EquipmentDTO | null;
  notFound: boolean;
}

const LS_CHECKPOINT = "movecontrol.scan.checkpointId";

export default function ScanPage() {
  const { data: session } = useSession();
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [checkpointId, setCheckpointId] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [pending, setPending] = useState<PendingScan | null>(null);
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

  const selectedCheckpoint = checkpoints.find((c) => c.id === checkpointId) ?? null;

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

  // 1) QR Code lido pela câmara → pára o scanner e procura o equipamento,
  // para o utilizador confirmar antes de gravar seja o que for.
  async function handleDetected(hostname: string) {
    if (pending) return; // já há uma leitura à espera de confirmação
    setScannerActive(false);
    setPending({ hostname, loading: true, equipment: null, notFound: false });

    try {
      const res = await fetch(`/api/equipment/${encodeURIComponent(hostname)}`);
      if (res.status === 404) {
        setPending({ hostname, loading: false, equipment: null, notFound: true });
        return;
      }
      const equipment: EquipmentDTO = await res.json();
      setPending({ hostname, loading: false, equipment, notFound: false });
    } catch {
      setPending({ hostname, loading: false, equipment: null, notFound: true });
    }
  }

  function cancelPending() {
    setPending(null);
    setScannerActive(true);
  }

  // 2) Utilizador confirma → só agora é que o scan fica gravado.
  async function confirmPending() {
    if (!pending || busy) return;
    const { hostname } = pending;
    setBusy(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, checkpointId }),
      });
      const data = await res.json();
      const checkpointName = selectedCheckpoint?.name ?? "";

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
      setPending(null);
      setScannerActive(true);
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
            disabled={scannerActive || Boolean(pending)}
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
        {pending ? (
          <ConfirmScanCard
            pending={pending}
            checkpointName={selectedCheckpoint?.name ?? ""}
            busy={busy}
            onCancel={cancelPending}
            onConfirm={confirmPending}
          />
        ) : !scannerActive ? (
          <button
            disabled={!canScan}
            onClick={() => setScannerActive(true)}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canScan ? "Ativar Câmara e Iniciar Scan" : "Seleciona um checkpoint"}
          </button>
        ) : (
          <div className="space-y-3">
            <QRScanner active={scannerActive} onScan={handleDetected} />
            <button
              onClick={() => setScannerActive(false)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Parar Scanner
            </button>
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

function ConfirmScanCard({
  pending,
  checkpointName,
  busy,
  onCancel,
  onConfirm,
}: {
  pending: PendingScan;
  checkpointName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (pending.loading) {
    return <p className="py-6 text-center text-sm text-gray-400">A procurar equipamento…</p>;
  }

  if (pending.notFound || !pending.equipment) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold text-red-700">Equipamento &quot;{pending.hostname}&quot; não encontrado.</p>
        <p className="text-xs text-gray-500">Regista-o primeiro em Equipamentos, ou confirma que o QR Code está correto.</p>
        <button
          onClick={onCancel}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Voltar a Ler
        </button>
      </div>
    );
  }

  const eq = pending.equipment;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500">Confirma a atualização de estado</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-lg font-bold text-gray-900">{eq.hostname}</p>
          <StatusBadge status={eq.status} />
        </div>
        {eq.model && <p className="text-xs text-gray-400">{eq.model}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Localização atual</p>
          <p className="font-medium text-gray-700">{eq.currentCheckpoint?.name ?? "Pendente"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Novo checkpoint</p>
          <p className="font-semibold text-brand-700">{checkpointName || "—"}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? "A gravar…" : "Confirmar Atualização"}
        </button>
      </div>
    </div>
  );
}
