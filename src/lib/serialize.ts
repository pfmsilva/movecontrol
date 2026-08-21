import type { Prisma } from "@prisma/client";
import { deriveStatus } from "@/lib/utils";
import type { EquipmentDTO, ScanEventDTO, CheckpointDTO, UserDTO } from "@/lib/types";

export type EquipmentWithScans = Prisma.EquipmentGetPayload<{
  include: { scans: { include: { checkpoint: true; user: true } } };
}>;

function toCheckpointDTO(cp: {
  id: string;
  name: string;
  order: number;
  description: string | null;
  createdAt: Date;
}): CheckpointDTO {
  return {
    id: cp.id,
    name: cp.name,
    order: cp.order,
    description: cp.description,
    createdAt: cp.createdAt.toISOString(),
  };
}

function toUserDTO(u: { id: string; name: string; email: string | null; createdAt: Date }): UserDTO {
  return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt.toISOString() };
}

function toScanDTO(
  s: EquipmentWithScans["scans"][number]
): ScanEventDTO {
  return {
    id: s.id,
    equipmentId: s.equipmentId,
    checkpointId: s.checkpointId,
    userId: s.userId,
    notes: s.notes,
    timestamp: s.timestamp.toISOString(),
    checkpoint: toCheckpointDTO(s.checkpoint),
    user: toUserDTO(s.user),
  };
}

/**
 * Converte um Equipment (com scans incluídos) num EquipmentDTO,
 * calculando o estado atual a partir do checkpoint mais recente.
 */
export function toEquipmentDTO(
  equipment: EquipmentWithScans,
  maxCheckpointOrder: number | null,
  opts: { includeHistory?: boolean } = {}
): EquipmentDTO {
  const sortedScans = [...equipment.scans].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
  const lastScanRaw = sortedScans[0] ?? null;
  const lastScan = lastScanRaw ? toScanDTO(lastScanRaw) : null;
  const status = deriveStatus(lastScanRaw?.checkpoint.order ?? null, maxCheckpointOrder);

  return {
    id: equipment.id,
    hostname: equipment.hostname,
    model: equipment.model,
    serialNumber: equipment.serialNumber,
    notes: equipment.notes,
    createdAt: equipment.createdAt.toISOString(),
    updatedAt: equipment.updatedAt.toISOString(),
    status,
    currentCheckpoint: lastScan?.checkpoint ?? null,
    lastScan,
    ...(opts.includeHistory ? { scans: sortedScans.map(toScanDTO) } : {}),
  };
}
