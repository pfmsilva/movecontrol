import type { Prisma, Role } from "@prisma/client";
import { deriveStatus } from "@/lib/utils";
import type {
  EquipmentDTO,
  ScanEventDTO,
  CheckpointDTO,
  ScanUserDTO,
  UserDTO,
  PortConnectionDTO,
  PalletRefDTO,
  PalletDTO,
  PalletSummaryDTO,
  PalletEquipmentRefDTO,
  EquipmentStatus,
} from "@/lib/types";

/** Include partilhado por todas as queries que depois passam por toEquipmentDTO. */
export const EQUIPMENT_INCLUDE = {
  scans: { include: { checkpoint: true, user: true, pallet: true } },
  ports: true,
} satisfies Prisma.EquipmentInclude;

export type EquipmentWithScans = Prisma.EquipmentGetPayload<{
  include: typeof EQUIPMENT_INCLUDE;
}>;

function toPortConnectionDTO(p: EquipmentWithScans["ports"][number]): PortConnectionDTO {
  return {
    id: p.id,
    order: p.order,
    portType: p.portType,
    etiquetaOrigem: p.etiquetaOrigem,
    portaEtiquetaDestino: p.portaEtiquetaDestino,
    patchPanelOrigem: p.patchPanelOrigem,
    patchPanelDestino: p.patchPanelDestino,
  };
}

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

function toScanUserDTO(u: { id: string; name: string; role: Role }): ScanUserDTO {
  return { id: u.id, name: u.name, role: u.role };
}

function toPalletRefDTO(p: { id: string; code: string; label: string | null } | null): PalletRefDTO | null {
  if (!p) return null;
  return { id: p.id, code: p.code, label: p.label };
}

export type UserWithCheckpoints = Prisma.UserGetPayload<{ include: { validatorCheckpoints: true } }>;

/** Converte um User (sem nunca expor o passwordHash) num UserDTO. */
export function toUserDTO(u: UserWithCheckpoints): UserDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    validatorCheckpoints: u.validatorCheckpoints.map(toCheckpointDTO),
  };
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
    user: toScanUserDTO(s.user),
    pallet: toPalletRefDTO(s.pallet),
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
    wave: equipment.wave,
    equipmentType: equipment.equipmentType,
    manufacturer: equipment.manufacturer,
    assetTag: equipment.assetTag,
    kvm: equipment.kvm,
    powerCables: equipment.powerCables,
    specialCables: equipment.specialCables,
    arms: equipment.arms,
    powerLocation: equipment.powerLocation,
    cableConnection: equipment.cableConnection,
    rails: equipment.rails,
    originDatacenter: equipment.originDatacenter,
    originEp: equipment.originEp,
    originIsland: equipment.originIsland,
    originRack: equipment.originRack,
    originPosition: equipment.originPosition,
    destinationDatacenter: equipment.destinationDatacenter,
    destinationIpTelecom: equipment.destinationIpTelecom,
    destinationIsland: equipment.destinationIsland,
    destinationRack: equipment.destinationRack,
    destinationPosition: equipment.destinationPosition,
    ports: [...equipment.ports].sort((a, b) => a.order - b.order).map(toPortConnectionDTO),
    ...(opts.includeHistory ? { scans: sortedScans.map(toScanDTO) } : {}),
  };
}

// — Paletes —

export const PALLET_ITEM_INCLUDE = {
  items: {
    include: {
      equipment: {
        include: { scans: { include: { checkpoint: true }, orderBy: { timestamp: "desc" }, take: 1 } },
      },
    },
  },
} satisfies Prisma.PalletInclude;

export type PalletWithItems = Prisma.PalletGetPayload<{ include: typeof PALLET_ITEM_INCLUDE }>;

/** Converte uma Palete (com items + equipamentos incluídos) num PalletDTO. */
export function toPalletDTO(pallet: PalletWithItems, maxCheckpointOrder: number | null): PalletDTO {
  const items: PalletEquipmentRefDTO[] = pallet.items.map(({ equipment }) => {
    const lastScan = equipment.scans[0] ?? null;
    const status: EquipmentStatus = deriveStatus(lastScan?.checkpoint.order ?? null, maxCheckpointOrder);
    return {
      id: equipment.id,
      hostname: equipment.hostname,
      model: equipment.model,
      status,
      currentCheckpoint: lastScan ? toCheckpointDTO(lastScan.checkpoint) : null,
    };
  });

  return {
    id: pallet.id,
    code: pallet.code,
    label: pallet.label,
    notes: pallet.notes,
    createdAt: pallet.createdAt.toISOString(),
    items,
  };
}

export const PALLET_SUMMARY_INCLUDE = {
  items: { include: { equipment: { select: { hostname: true } } } },
} satisfies Prisma.PalletInclude;

export type PalletWithHostnames = Prisma.PalletGetPayload<{ include: typeof PALLET_SUMMARY_INCLUDE }>;

/** Versão reduzida (para listagens) — sem precisar de calcular o estado de cada equipamento. */
export function toPalletSummaryDTO(pallet: PalletWithHostnames): PalletSummaryDTO {
  return {
    id: pallet.id,
    code: pallet.code,
    label: pallet.label,
    notes: pallet.notes,
    createdAt: pallet.createdAt.toISOString(),
    itemCount: pallet.items.length,
    hostnames: pallet.items.map((i) => i.equipment.hostname),
  };
}
