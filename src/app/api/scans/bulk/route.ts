import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canSetCheckpointManually } from "@/lib/permissions";
import { recordEquipmentCheckpoint, recordPalletCheckpoint, PALLET_WITH_ITEMS_FOR_SCAN } from "@/lib/scanning";

/**
 * Define manualmente o mesmo checkpoint para vários equipamentos e/ou várias
 * paletes de uma só vez (ex: selecionados no Dashboard). Reservado a
 * ADMIN/CONTROLLER — é sempre "manual" (não corresponde a nenhum scan físico).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canSetCheckpointManually(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  const { hostnames, palletCodes, checkpointId } = body ?? {};
  const userId = session.user.id;

  const hostnameList: string[] = Array.isArray(hostnames) ? hostnames.filter((h) => typeof h === "string") : [];
  const palletCodeList: string[] = Array.isArray(palletCodes) ? palletCodes.filter((c) => typeof c === "string") : [];

  if (hostnameList.length === 0 && palletCodeList.length === 0) {
    return NextResponse.json({ error: "Seleciona pelo menos um equipamento ou uma palete." }, { status: 400 });
  }
  if (!checkpointId) {
    return NextResponse.json({ error: "Seleciona o ponto de controlo a aplicar." }, { status: 400 });
  }

  const checkpoint = await prisma.checkpoint.findUnique({ where: { id: checkpointId } });
  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint inválido." }, { status: 400 });
  }

  const updatedEquipment: string[] = [];
  const updatedPallets: string[] = [];
  const errors: { target: string; message: string }[] = [];

  for (const hostname of hostnameList) {
    const equipment = await prisma.equipment.findUnique({ where: { hostname } });
    if (!equipment) {
      errors.push({ target: hostname, message: "Equipamento não encontrado." });
      continue;
    }
    await recordEquipmentCheckpoint({
      equipmentId: equipment.id,
      checkpointId: checkpoint.id,
      userId,
      manual: true,
    });
    updatedEquipment.push(hostname);
  }

  for (const code of palletCodeList) {
    const pallet = await prisma.pallet.findUnique({
      where: { code },
      include: PALLET_WITH_ITEMS_FOR_SCAN,
    });
    if (!pallet) {
      errors.push({ target: code, message: "Palete não encontrada." });
      continue;
    }
    if (pallet.items.length === 0) {
      errors.push({ target: code, message: "Palete sem equipamentos associados." });
      continue;
    }
    await recordPalletCheckpoint({
      pallet,
      checkpointId: checkpoint.id,
      userId,
      manual: true,
    });
    updatedPallets.push(code);
  }

  const anySuccess = updatedEquipment.length > 0 || updatedPallets.length > 0;

  return NextResponse.json(
    {
      checkpoint: {
        id: checkpoint.id,
        name: checkpoint.name,
        order: checkpoint.order,
        description: checkpoint.description,
        createdAt: checkpoint.createdAt.toISOString(),
      },
      updatedEquipment,
      updatedPallets,
      errors,
    },
    { status: anySuccess ? 200 : 400 }
  );
}
