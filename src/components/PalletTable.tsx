"use client";

import Link from "next/link";
import type { PalletSummaryDTO } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

interface Props {
  pallets: PalletSummaryDTO[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (code: string) => void;
  onToggleAll?: (codes: string[]) => void;
}

export default function PalletTable({ pallets, selectable, selected, onToggle, onToggleAll }: Props) {
  if (pallets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        Nenhuma palete encontrada com os filtros atuais.
      </div>
    );
  }

  const allCodes = pallets.map((p) => p.code);
  const allSelected = selectable && allCodes.length > 0 && allCodes.every((c) => selected?.has(c));

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
                  onChange={() => onToggleAll?.(allCodes)}
                  aria-label="Selecionar todas"
                />
              </th>
            )}
            <th className="px-4 py-3">Palete</th>
            <th className="px-4 py-3">Localização Atual</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Equipamentos</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pallets.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              {selectable && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected?.has(p.code) ?? false}
                    onChange={() => onToggle?.(p.code)}
                    aria-label={`Selecionar ${p.code}`}
                  />
                </td>
              )}
              <td className="px-4 py-3">
                <Link href={`/pallets/${encodeURIComponent(p.code)}`} className="font-semibold text-gray-900 hover:text-brand-700">
                  {p.code}
                </Link>
                {p.label && <p className="text-xs text-gray-400">{p.label}</p>}
              </td>
              <td className="px-4 py-3 text-gray-600">{p.currentCheckpoint ? p.currentCheckpoint.name : "—"}</td>
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
                    Imprimir
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
