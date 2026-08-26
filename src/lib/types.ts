import type { Role, PortType, PalletEventType } from "@prisma/client";

export type { Role, PortType, PalletEventType };

export type EquipmentStatus = "pending" | "in_transit" | "completed";

export interface CheckpointDTO {
  id: string;
  name: string;
  order: number;
  description: string | null;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  validatorCheckpoints: CheckpointDTO[];
}

/** Versão reduzida do utilizador, usada quando embutido num ScanEvent. */
export interface ScanUserDTO {
  id: string;
  name: string;
  role: Role;
}

/** Referência reduzida a uma Palete, usada quando embutida noutro objeto. */
export interface PalletRefDTO {
  id: string;
  code: string;
  label: string | null;
}

export interface ScanEventDTO {
  id: string;
  equipmentId: string;
  checkpointId: string;
  userId: string;
  notes: string | null;
  timestamp: string;
  checkpoint: CheckpointDTO;
  user: ScanUserDTO;
  /** Não nulo quando este scan resultou de um scan de Palete. */
  pallet: PalletRefDTO | null;
  /** true se o checkpoint foi definido manualmente (sem scan físico do QR Code). */
  manual: boolean;
}

/** Prefixo usado no conteúdo do QR Code de uma Palete, para o distinguir do
 * QR (só o hostname) de um Equipamento ao fazer scan. */
export const PALLET_QR_PREFIX = "PALETE:";

export interface PalletEquipmentRefDTO {
  id: string;
  hostname: string;
  model: string | null;
  status: EquipmentStatus;
  currentCheckpoint: CheckpointDTO | null;
}

/** Uma entrada do log de auditoria de uma palete. */
export interface PalletEventDTO {
  id: string;
  type: PalletEventType;
  timestamp: string;
  user: ScanUserDTO;
  equipment: { id: string; hostname: string } | null;
  checkpoint: CheckpointDTO | null;
  /** Em CHECKPOINT_SCAN: true se foi definido manualmente (sem scan físico do QR Code). */
  manual: boolean;
}

export const PALLET_EVENT_LABELS: Record<PalletEventType, string> = {
  ITEM_ADDED: "Equipamento adicionado",
  ITEM_REMOVED: "Equipamento removido",
  CHECKPOINT_SCAN: "Checkpoint",
};

export interface PalletDTO {
  id: string;
  code: string;
  label: string | null;
  notes: string | null;
  createdAt: string;
  status: EquipmentStatus;
  currentCheckpoint: CheckpointDTO | null;
  items: PalletEquipmentRefDTO[];
  events: PalletEventDTO[];
}

export interface PalletSummaryDTO {
  id: string;
  code: string;
  label: string | null;
  notes: string | null;
  createdAt: string;
  status: EquipmentStatus;
  currentCheckpoint: CheckpointDTO | null;
  itemCount: number;
  hostnames: string[];
}

/** Resultado de uma atualização manual de checkpoint em lote. */
export interface BulkCheckpointResultDTO {
  checkpoint: CheckpointDTO;
  updatedEquipment: string[];
  updatedPallets: string[];
  errors: { target: string; message: string }[];
}

export interface PortConnectionDTO {
  id: string;
  order: number;
  portType: PortType | null;
  etiquetaOrigem: string | null;
  portaEtiquetaDestino: string | null;
  patchPanelOrigem: string | null;
  patchPanelDestino: string | null;
}

export const PORT_TYPE_LABELS: Record<PortType, string> = {
  RJ45: "RJ45",
  FIBRA: "Fibra",
  OUTRAS: "Outras",
};

/** Campos da Ficha de Equipamento que não têm valor definido ainda (opcionais, texto livre). */
export interface EquipmentFormFields {
  wave: string | null;
  equipmentType: string | null;
  manufacturer: string | null;
  assetTag: string | null;
  kvm: string | null;
  powerCables: string | null;
  specialCables: string | null;
  arms: string | null;
  powerLocation: string | null;
  cableConnection: string | null;
  rails: string | null;
  originDatacenter: string | null;
  originEp: string | null;
  originIsland: string | null;
  originRack: string | null;
  originPosition: string | null;
  destinationDatacenter: string | null;
  destinationIpTelecom: string | null;
  destinationIsland: string | null;
  destinationRack: string | null;
  destinationPosition: string | null;
}

export interface EquipmentDTO extends EquipmentFormFields {
  id: string;
  hostname: string;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  status: EquipmentStatus;
  currentCheckpoint: CheckpointDTO | null;
  lastScan: ScanEventDTO | null;
  scans?: ScanEventDTO[];
  ports: PortConnectionDTO[];
}

export interface StatsDTO {
  total: number;
  pending: number;
  inTransit: number;
  completed: number;
  pendingPct: number;
  inTransitPct: number;
  completedPct: number;
  perCheckpoint: { checkpoint: CheckpointDTO; count: number }[];
}

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  pending: "Pendente",
  in_transit: "Em Trânsito",
  completed: "Concluído",
};

export const STATUS_COLORS: Record<EquipmentStatus, string> = {
  pending: "bg-gray-100 text-gray-700 ring-gray-400/30",
  in_transit: "bg-amber-100 text-amber-800 ring-amber-500/30",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-500/30",
};
