import type { ScanEventDTO } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function MovementTimeline({ scans }: { scans: ScanEventDTO[] }) {
  if (scans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Ainda não existem registos de movimentação para este equipamento.
      </div>
    );
  }

  // scans já vem ordenado do mais recente para o mais antigo
  return (
    <ol className="relative border-s-2 border-gray-200 ps-5">
      {scans.map((scan, idx) => (
        <li key={scan.id} className="mb-6 last:mb-0">
          <span
            className={`absolute -start-[9px] mt-1 h-4 w-4 rounded-full ring-4 ring-white ${
              idx === 0 ? "bg-brand-600" : "bg-gray-300"
            }`}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-semibold text-gray-900">
              {scan.checkpoint.order}. {scan.checkpoint.name}
            </p>
            <time className="text-xs text-gray-400">{formatDateTime(scan.timestamp)}</time>
          </div>
          <p className="text-sm text-gray-500">Registado por {scan.user.name}</p>
          {scan.notes && <p className="mt-1 text-sm text-gray-600">{scan.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
