"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { EquipmentDTO, PalletSummaryDTO, StatsDTO, CheckpointDTO, EquipmentStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { canSetCheckpointManually } from "@/lib/permissions";
import StatsCards from "@/components/StatsCards";
import EquipmentTable from "@/components/EquipmentTable";
import PalletTable from "@/components/PalletTable";
import BulkCheckpointBar from "@/components/BulkCheckpointBar";

const POLL_MS = 15000;

function computeStats(items: { status: EquipmentStatus }[]): StatsDTO {
  const total = items.length;
  const pending = items.filter((i) => i.status === "pending").length;
  const inTransit = items.filter((i) => i.status === "in_transit").length;
  const completed = items.filter((i) => i.status === "completed").length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
  return {
    total,
    pending,
    inTransit,
    completed,
    pendingPct: pct(pending),
    inTransitPct: pct(inTransit),
    completedPct: pct(completed),
    perCheckpoint: [],
  };
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const canBulk = canSetCheckpointManually(session?.user.role);

  const [equipment, setEquipment] = useState<EquipmentDTO[]>([]);
  const [pallets, setPallets] = useState<PalletSummaryDTO[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // — Equipamentos —
  const [eqSearch, setEqSearch] = useState("");
  const [eqCheckpointFilter, setEqCheckpointFilter] = useState<string>("all");
  const [eqStatusFilter, setEqStatusFilter] = useState<EquipmentStatus | "all">("all");
  const [eqSelected, setEqSelected] = useState<Set<string>>(new Set());

  // — Paletes —
  const [plSearch, setPlSearch] = useState("");
  const [plCheckpointFilter, setPlCheckpointFilter] = useState<string>("all");
  const [plStatusFilter, setPlStatusFilter] = useState<EquipmentStatus | "all">("all");
  const [plSelected, setPlSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [eqRes, plRes, cpRes] = await Promise.all([
        fetch("/api/equipment", { cache: "no-store" }),
        fetch("/api/pallets", { cache: "no-store" }),
        fetch("/api/checkpoints", { cache: "no-store" }),
      ]);
      const [eqData, plData, cpData] = await Promise.all([eqRes.json(), plRes.json(), cpRes.json()]);
      setEquipment(eqData);
      setPallets(plData);
      setCheckpoints(cpData);
      setLastSync(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const equipmentStats = useMemo(() => computeStats(equipment), [equipment]);
  const palletStats = useMemo(() => computeStats(pallets), [pallets]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      if (eqStatusFilter !== "all" && eq.status !== eqStatusFilter) return false;
      if (eqCheckpointFilter !== "all" && eq.currentCheckpoint?.id !== eqCheckpointFilter) return false;
      if (eqSearch.trim() && !eq.hostname.toLowerCase().includes(eqSearch.trim().toLowerCase())) return false;
      return true;
    });
  }, [equipment, eqSearch, eqCheckpointFilter, eqStatusFilter]);

  const filteredPallets = useMemo(() => {
    return pallets.filter((p) => {
      if (plStatusFilter !== "all" && p.status !== plStatusFilter) return false;
      if (plCheckpointFilter !== "all" && p.currentCheckpoint?.id !== plCheckpointFilter) return false;
      if (plSearch.trim()) {
        const needle = plSearch.trim().toLowerCase();
        const haystack = `${p.code} ${p.label ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [pallets, plSearch, plCheckpointFilter, plStatusFilter]);

  function toggleEq(hostname: string) {
    setEqSelected((prev) => {
      const next = new Set(prev);
      if (next.has(hostname)) next.delete(hostname);
      else next.add(hostname);
      return next;
    });
  }

  function toggleAllEq(hostnames: string[]) {
    setEqSelected((prev) => {
      const allSelected = hostnames.every((h) => prev.has(h));
      return allSelected ? new Set() : new Set(hostnames);
    });
  }

  function togglePl(code: string) {
    setPlSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAllPl(codes: string[]) {
    setPlSelected((prev) => {
      const allSelected = codes.every((c) => prev.has(c));
      return allSelected ? new Set() : new Set(codes);
    });
  }

  async function applyBulk(checkpointId: string, kind: "equipment" | "pallet") {
    const body =
      kind === "equipment"
        ? { hostnames: Array.from(eqSelected), checkpointId }
        : { palletCodes: Array.from(plSelected), checkpointId };
    const res = await fetch("/api/scans/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Não foi possível aplicar o checkpoint.");
      return;
    }
    if (data.errors?.length > 0) {
      alert(
        `Aplicado com ${data.errors.length} erro(s):\n` +
          data.errors.map((e: { target: string; message: string }) => `${e.target}: ${e.message}`).join("\n")
      );
    }
    if (kind === "equipment") setEqSelected(new Set());
    else setPlSelected(new Set());
    load();
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard de Migração</h1>
          <p className="text-sm text-gray-500">
            Localização e estado de cada equipamento e palete em tempo real.
            {lastSync && <span className="ml-1 text-gray-400">Sincronizado {lastSync.toLocaleTimeString("pt-PT")}.</span>}
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Atualizar agora
        </button>
      </div>

      {/* — Equipamentos — */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Equipamentos</h2>
        <StatsCards stats={equipmentStats} />

        <div className="flex flex-wrap gap-3">
          <input
            value={eqSearch}
            onChange={(e) => setEqSearch(e.target.value)}
            placeholder="Pesquisar por nome/hostname…"
            className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={eqCheckpointFilter}
            onChange={(e) => setEqCheckpointFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os checkpoints</option>
            {checkpoints.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.order}. {cp.name}
              </option>
            ))}
          </select>
          <select
            value={eqStatusFilter}
            onChange={(e) => setEqStatusFilter(e.target.value as EquipmentStatus | "all")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os estados</option>
            {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {canBulk && (
          <BulkCheckpointBar
            count={eqSelected.size}
            itemLabel="equipamento(s)"
            checkpoints={checkpoints}
            onApply={(cpId) => applyBulk(cpId, "equipment")}
            onClear={() => setEqSelected(new Set())}
          />
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">A carregar…</div>
        ) : (
          <EquipmentTable
            equipment={filteredEquipment}
            selectable={canBulk}
            selected={eqSelected}
            onToggle={toggleEq}
            onToggleAll={toggleAllEq}
          />
        )}
      </section>

      {/* — Paletes — */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Paletes</h2>
        <StatsCards stats={palletStats} totalLabel="Total de Paletes" />

        <div className="flex flex-wrap gap-3">
          <input
            value={plSearch}
            onChange={(e) => setPlSearch(e.target.value)}
            placeholder="Pesquisar por código/etiqueta…"
            className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={plCheckpointFilter}
            onChange={(e) => setPlCheckpointFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os checkpoints</option>
            {checkpoints.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.order}. {cp.name}
              </option>
            ))}
          </select>
          <select
            value={plStatusFilter}
            onChange={(e) => setPlStatusFilter(e.target.value as EquipmentStatus | "all")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os estados</option>
            {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {canBulk && (
          <BulkCheckpointBar
            count={plSelected.size}
            itemLabel="palete(s)"
            checkpoints={checkpoints}
            onApply={(cpId) => applyBulk(cpId, "pallet")}
            onClear={() => setPlSelected(new Set())}
          />
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">A carregar…</div>
        ) : (
          <PalletTable
            pallets={filteredPallets}
            selectable={canBulk}
            selected={plSelected}
            onToggle={togglePl}
            onToggleAll={toggleAllPl}
          />
        )}
      </section>
    </div>
  );
}
