"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { EquipmentDTO, StatsDTO, CheckpointDTO, EquipmentStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import StatsCards from "@/components/StatsCards";
import EquipmentTable from "@/components/EquipmentTable";

const POLL_MS = 15000;

export default function DashboardClient() {
  const [equipment, setEquipment] = useState<EquipmentDTO[]>([]);
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [search, setSearch] = useState("");
  const [checkpointFilter, setCheckpointFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const [eqRes, statsRes, cpRes] = await Promise.all([
        fetch("/api/equipment", { cache: "no-store" }),
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/checkpoints", { cache: "no-store" }),
      ]);
      const [eqData, statsData, cpData] = await Promise.all([eqRes.json(), statsRes.json(), cpRes.json()]);
      setEquipment(eqData);
      setStats(statsData);
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

  const filtered = useMemo(() => {
    return equipment.filter((eq) => {
      if (statusFilter !== "all" && eq.status !== statusFilter) return false;
      if (checkpointFilter !== "all" && eq.currentCheckpoint?.id !== checkpointFilter) return false;
      if (search.trim() && !eq.hostname.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [equipment, search, checkpointFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard de Migração</h1>
          <p className="text-sm text-gray-500">
            Localização e estado de cada equipamento em tempo real.
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

      {stats && <StatsCards stats={stats} />}

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome/hostname…"
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={checkpointFilter}
          onChange={(e) => setCheckpointFilter(e.target.value)}
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | "all")}
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

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          A carregar…
        </div>
      ) : (
        <EquipmentTable equipment={filtered} />
      )}
    </div>
  );
}
