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
  PalletEventDTO,
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
  events: {
    include: { equipment: { select: { id: true, hostname: true } }, checkpoint: true, user: true },
    orderBy: { timestamp: "desc" },
  },
} satisfies Prisma.PalletInclude;

export type PalletWithItems = Prisma.PalletGetPayload<{ include: typeof PALLET_ITEM_INCLUDE }>;

function toPalletEventDTO(e: PalletWithItems["events"][number]): PalletEventDTO {
  return {
    id: e.id,
    type: e.type,
    timestamp: e.timestamp.toISOString(),
    user: toScanUserDTO(e.user),
    equipment: e.equipment ? { id: e.equipment.id, hostname: e.equipment.hostname } : null,
    checkpoint: e.checkpoint ? toCheckpointDTO(e.checkpoint) : null,
  };
}

/** Deriva o estado/checkpoint atual da palete a partir do seu próprio log (CHECKPOINT_SCAN mais recente). */
function derivePalletCheckpoint(
  events: PalletWithItems["events"],
  maxCheckpointOrder: number | null
): { status: EquipmentStatus; currentCheckpoint: CheckpointDTO | null } {
  const lastScan = events.find((e) => e.type === "CHECKPOINT_SCAN" && e.checkpoint);
  const currentCheckpoint = lastScan?.checkpoint ? toCheckpointDTO(lastScan.checkpoint) : null;
  const status = deriveStatus(currentCheckpoint?.order ?? null, maxCheckpointOrder);
  return { status, currentCheckpoint };
}

/** Converte uma Palete (com items + equipamentos + log incluídos) num PalletDTO. */
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

  const { status, currentCheckpoint } = derivePalletCheckpoint(pallet.events, maxCheckpointOrder);

  return {
    id: pallet.id,
    code: pallet.code,
    label: pallet.label,
    notes: pallet.notes,
    createdAt: pallet.createdAt.toISOString(),
    status,
    currentCheckpoint,
    items,
    events: pallet.events.map(toPalletEventDTO),
  };
}

export const PALLET_SUMMARY_INCLUDE = {
  items: { include: { equipment: { select: { hostname: true } } } },
  events: {
    where: { type: "CHECKPOINT_SCAN" as const },
    include: { checkpoint: true },
    orderBy: { timestamp: "desc" },
    take: 1,
  },
} satisfies Prisma.PalletInclude;

export type PalletWithHostnames = Prisma.PalletGetPayload<{ include: typeof PALLET_SUMMARY_INCLUDE }>;

/** Versão reduzida (para listagens) — sem precisar do log completo de cada palete. */
export function toPalletSummaryDTO(pallet: PalletWithHostnames, maxCheckpointOrder: number | null): PalletSummaryDTO {
  const lastScan = pallet.events[0] ?? null;
  const status = deriveStatus(lastScan?.checkpoint?.order ?? null, maxCheckpointOrder);

  return {
    id: pallet.id,
    code: pallet.code,
    label: pallet.label,
    notes: pallet.notes,
    createdAt: pallet.createdAt.toISOString(),
    status,
    itemCount: pallet.items.length,
    hostnames: pallet.items.map((i) => i.equipment.hostname),
  };
}
