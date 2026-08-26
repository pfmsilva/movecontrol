import Link from "next/link";
import type { PalletEventDTO } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const DOT_COLOR: Record<PalletEventDTO["type"], string> = {
  CHECKPOINT_SCAN: "bg-brand-600",
  ITEM_ADDED: "bg-emerald-500",
  ITEM_REMOVED: "bg-red-500",
};

function describe(e: PalletEventDTO): React.ReactNode {
  switch (e.type) {
    case "CHECKPOINT_SCAN":
      return (
        <p className="font-semibold text-gray-900">
          {e.checkpoint ? `${e.checkpoint.order}. ${e.checkpoint.name}` : "Checkpoint"}
        </p>
      );
    case "ITEM_ADDED":
      return (
        <p className="font-semibold text-gray-900">
          Equipamento adicionado:{" "}
          {e.equipment ? (
            <Link href={`/equipment/${encodeURIComponent(e.equipment.hostname)}`} className="text-brand-600 hover:underline">
              {e.equipment.hostname}
            </Link>
          ) : (
            "—"
          )}
        </p>
      );
    case "ITEM_REMOVED":
      return (
        <p className="font-semibold text-gray-900">
          Equipamento removido:{" "}
          {e.equipment ? (
            <Link href={`/equipment/${encodeURIComponent(e.equipment.hostname)}`} className="text-brand-600 hover:underline">
              {e.equipment.hostname}
            </Link>
          ) : (
            "—"
          )}
        </p>
      );
  }
}

export default function PalletHistory({ events }: { events: PalletEventDTO[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Ainda não há nenhum registo para esta palete.
      </div>
    );
  }

  return (
    <ol className="relative border-s-2 border-gray-200 ps-5">
      {events.map((e) => (
        <li key={e.id} className="mb-6 last:mb-0">
          <span className={`absolute -start-[9px] mt-1 h-4 w-4 rounded-full ring-4 ring-white ${DOT_COLOR[e.type]}`} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            {describe(e)}
            <time className="text-xs text-gray-400">{formatDateTime(e.timestamp)}</time>
          </div>
          <p className="text-sm text-gray-500">Por {e.user.name}</p>
        </li>
      ))}
    </ol>
  );
}
