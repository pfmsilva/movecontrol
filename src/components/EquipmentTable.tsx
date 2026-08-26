"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { EquipmentDTO } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { formatRelative } from "@/lib/utils";

interface Props {
  equipment: EquipmentDTO[];
  /** Quando definido, mostra uma checkbox por linha (seleção para ação em lote). */
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (hostname: string) => void;
  onToggleAll?: (hostnames: string[]) => void;
}

export default function EquipmentTable({ equipment, selectable, selected, onToggle, onToggleAll }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (equipment.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        Nenhum equipamento encontrado com os filtros atuais.
      </div>
    );
  }

  const allHostnames = equipment.map((eq) => eq.hostname);
  const allSelected = selectable && allHostnames.length > 0 && allHostnames.every((h) => selected?.has(h));

  return (
    <div className="scroll-thin overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            {selectable && (
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleAll?.(allHostnames)}
                  aria-label="Selecionar todos"
                />
              </th>
            )}
            <th className="px-4 py-3">Equipamento</th>
            <th className="px-4 py-3">Localização Atual</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Última Atualização</th>
            <th className="px-4 py-3">Responsável</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {equipment.map((eq) => (
            <Fragment key={eq.id}>
              <tr className="hover:bg-gray-50">
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected?.has(eq.hostname) ?? false}
                      onChange={() => onToggle?.(eq.hostname)}
                      aria-label={`Selecionar ${eq.hostname}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpanded(expanded === eq.id ? null : eq.id)}
                    className="font-semibold text-gray-900 hover:text-brand-700"
                  >
                    {eq.hostname}
                  </button>
                  {eq.model && <p className="text-xs text-gray-400">{eq.model}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {eq.currentCheckpoint ? eq.currentCheckpoint.name : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={eq.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {eq.lastScan ? formatRelative(eq.lastScan.timestamp) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">{eq.lastScan?.user.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3 whitespace-nowrap text-xs font-medium">
                    <button
                      onClick={() => setExpanded(expanded === eq.id ? null : eq.id)}
                      className="text-brand-600 hover:underline"
                    >
                      {expanded === eq.id ? "Ocultar" : "Histórico"}
                    </button>
                    <Link href={`/equipment/${encodeURIComponent(eq.hostname)}`} className="text-brand-600 hover:underline">
                      Detalhe
                    </Link>
                    <Link
                      href={`/equipment/${encodeURIComponent(eq.hostname)}/print`}
                      className="text-brand-600 hover:underline"
                    >
                      Imprimir
                    </Link>
                  </div>
                </td>
              </tr>
              {expanded === eq.id && (
                <tr className="bg-gray-50/70">
                  <td colSpan={selectable ? 7 : 6} className="px-4 py-3">
                    {eq.lastScan == null ? (
                      <p className="text-xs text-gray-400">Ainda não existem registos de scan para este equipamento.</p>
                    ) : (
                      <MiniTimelineHint hostname={eq.hostname} />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniTimelineHint({ hostname }: { hostname: string }) {
  return (
    <p className="text-xs text-gray-500">
      Consulta a timeline completa de movimentação em{" "}
      <Link href={`/equipment/${encodeURIComponent(hostname)}`} className="font-medium text-brand-600 hover:underline">
        detalhe do equipamento
      </Link>
      .
    </p>
  );
}
