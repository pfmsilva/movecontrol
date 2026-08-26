import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Regista a passagem de UM equipamento por um checkpoint (scan real ou
 * definição manual). Usado tanto pelo scan individual como, indiretamente,
 * pelo scan/atualização em lote.
 */
export async function recordEquipmentCheckpoint(params: {
  equipmentId: string;
  checkpointId: string;
  userId: string;
  manual?: boolean;
  notes?: string | null;
  palletId?: string | null;
  timestamp?: Date;
}) {
  return prisma.scanEvent.create({
    data: {
      equipmentId: params.equipmentId,
      checkpointId: params.checkpointId,
      userId: params.userId,
      manual: params.manual ?? false,
      notes: params.notes?.trim() || null,
      palletId: params.palletId ?? null,
      ...(params.timestamp ? { timestamp: params.timestamp } : {}),
    },
  });
}

type PalletWithEquipmentIds = { id: string; items: { equipmentId: string }[] };

/**
 * Regista a passagem de uma PALETE por um checkpoint: cria um ScanEvent por
 * cada equipamento lá dentro (ligado à palete) + uma entrada CHECKPOINT_SCAN
 * no log de auditoria da palete (é dali que se deriva o estado da palete).
 */
export async function recordPalletCheckpoint(params: {
  pallet: PalletWithEquipmentIds;
  checkpointId: string;
  userId: string;
  manual?: boolean;
  notes?: string | null;
  timestamp?: Date;
}) {
  const timestamp = params.timestamp ?? new Date();
  const manual = params.manual ?? false;

  await prisma.scanEvent.createMany({
    data: params.pallet.items.map((item) => ({
      equipmentId: item.equipmentId,
      checkpointId: params.checkpointId,
      userId: params.userId,
      palletId: params.pallet.id,
      manual,
      notes: params.notes?.trim() || null,
      timestamp,
    })),
  });

  await prisma.palletEvent.create({
    data: {
      palletId: params.pallet.id,
      type: "CHECKPOINT_SCAN",
      checkpointId: params.checkpointId,
      userId: params.userId,
      manual,
      timestamp,
    },
  });

  return timestamp;
}

export const PALLET_WITH_ITEMS_FOR_SCAN = {
  items: { select: { equipmentId: true } },
} satisfies Prisma.PalletInclude;
