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
  email: string | null;
  createdAt: string;
}

export interface ScanEventDTO {
  id: string;
  equipmentId: string;
  checkpointId: string;
  userId: string;
  notes: string | null;
  timestamp: string;
  checkpoint: CheckpointDTO;
  user: UserDTO;
}

export interface EquipmentDTO {
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
