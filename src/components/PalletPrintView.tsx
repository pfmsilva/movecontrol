"use client";

import QRCode from "react-qr-code";
import type { PalletDTO } from "@/lib/types";
import { PALLET_QR_PREFIX } from "@/lib/types";

export default function PalletPrintView({ pallet }: { pallet: PalletDTO }) {
  return (
    <div>
      <div className="no-print mb-6">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="border border-gray-800 p-6 text-gray-900">
          <div className="flex items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <p className="text-lg font-extrabold tracking-wide">FICHA DE PALETE</p>
              {pallet.label && <p className="text-sm text-gray-600">{pallet.label}</p>}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-extrabold tracking-wide">{pallet.code}</p>
              <div className="rounded bg-white p-1.5 ring-1 ring-gray-300">
                <QRCode value={`${PALLET_QR_PREFIX}${pallet.code}`} size={90} />
              </div>
            </div>
          </div>

          {pallet.notes && <p className="mt-3 text-sm text-gray-600">{pallet.notes}</p>}

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Equipamentos ({pallet.items.length})
          </p>
          {pallet.items.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">Nenhum equipamento associado a esta palete.</p>
          ) : (
            <ol className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {pallet.items.map((item, i) => (
                <li key={item.id} className="border-b border-gray-200 py-1">
                  {i + 1}. <span className="font-medium">{item.hostname}</span>
                  {item.model && <span className="text-gray-400"> — {item.model}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
