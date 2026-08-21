import type { EquipmentStatus } from "./types";

/**
 * Deriva o estado do equipamento a partir do checkpoint do último scan
 * e da ordem máxima de checkpoints existente (checkpoint final).
 */
export function deriveStatus(
  lastCheckpointOrder: number | null | undefined,
  maxCheckpointOrder: number | null | undefined
): EquipmentStatus {
  if (lastCheckpointOrder == null) return "pending";
  if (maxCheckpointOrder != null && lastCheckpointOrder >= maxCheckpointOrder) {
    return "completed";
  }
  return "in_transit";
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelative(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour} h`;
  if (diffDay < 7) return `há ${diffDay} d`;
  return formatDateTime(d);
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
