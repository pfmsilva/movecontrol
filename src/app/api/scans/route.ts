import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isRestrictedValidator, canSetCheckpointManually } from "@/lib/permissions";
import { recordEquipmentCheckpoint, recordPalletCheckpoint } from "@/lib/scanning";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const checkpointId = searchParams.get("checkpointId") ?? undefined;
  const equipmentId = searchParams.get("equipmentId") ?? undefined;

  const scans = await prisma.scanEvent.findMany({
    where: {
      ...(checkpointId ? { checkpointId } : {}),
      ...(equipmentId ? { equipmentId } : {}),
    },
    include: { checkpoint: true, user: true, equipment: true },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return NextResponse.json(
    scans.map((s) => ({
      id: s.id,
      timestamp: s.timestamp.toISOString(),
      notes: s.notes,
      equipment: { id: s.equipment.id, hostname: s.equipment.hostname },
      checkpoint: { id: s.checkpoint.id, name: s.checkpoint.name, order: s.checkpoint.order },
      user: { id: s.user.id, name: s.user.name },
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json();
  const { hostname, palletCode, checkpointId, notes, manual } = body ?? {};
  // O utilizador responsável é sempre o da sessão autenticada — nunca confiar
  // num userId vindo do cliente.
  const userId = session.user.id;
  const isManual = manual === true;

  if (!hostname && !palletCode) {
    return NextResponse.json({ error: "ID do equipamento ou da palete em falta no QR Code." }, { status: 400 });
  }
  if (!checkpointId) {
    return NextResponse.json({ error: "Seleciona o ponto de controlo (checkpoint) atual." }, { status: 400 });
  }
  // Só ADMIN/CONTROLLER podem definir um checkpoint manualmente (sem scan
  // físico) — preserva o significado da flag e evita que um VALIDATOR a use
  // para disfarçar um scan normal.
  if (isManual && !canSetCheckpointManually(session.user.role)) {
    return NextResponse.json({ error: "Não tens permissão para definir checkpoints manualmente." }, { status: 403 });
  }

  const checkpoint = await prisma.checkpoint.findUnique({ where: { id: checkpointId } });
  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint inválido." }, { status: 400 });
  }

  // VALIDATOR só pode assumir os checkpoints que lhe estão associados.
  // Verificação sempre feita à BD (nunca só ao JWT) para refletir alterações
  // feitas por um ADMIN depois do login.
  if (isRestrictedValidator(session.user.role)) {
    const allowed = await prisma.user.findFirst({
      where: { id: userId, validatorCheckpoints: { some: { id: checkpointId } } },
      select: { id: true },
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Não tens permissão para efetuar scans neste checkpoint." },
        { status: 403 }
      );
    }
  }

  // — Scan de uma Palete: regista o mesmo checkpoint para todos os
  // equipamentos lá dentro, de uma só vez. —
  if (palletCode) {
    const pallet = await prisma.pallet.findUnique({
      where: { code: String(palletCode).trim() },
      include: { items: { include: { equipment: true } } },
    });
    if (!pallet) {
      return NextResponse.json(
        { error: `Palete "${palletCode}" não encontrada.`, code: "PALLET_NOT_FOUND" },
        { status: 404 }
      );
    }
    if (pallet.items.length === 0) {
      return NextResponse.json({ error: "Esta palete não tem nenhum equipamento associado." }, { status: 400 });
    }

    const timestamp = await recordPalletCheckpoint({
      pallet,
      checkpointId: checkpoint.id,
      userId,
      manual: isManual,
      notes,
    });

    return NextResponse.json(
      {
        type: "pallet" as const,
        timestamp: timestamp.toISOString(),
        manual: isManual,
        checkpoint: { id: checkpoint.id, name: checkpoint.name, order: checkpoint.order },
        user: { id: session.user.id, name: session.user.name },
        pallet: { id: pallet.id, code: pallet.code, label: pallet.label },
        equipment: pallet.items.map((i) => ({ id: i.equipment.id, hostname: i.equipment.hostname })),
      },
      { status: 201 }
    );
  }

  // — Scan individual de um Equipamento —
  const equipment = await prisma.equipment.findUnique({ where: { hostname: String(hostname).trim() } });
  if (!equipment) {
    return NextResponse.json(
      { error: `Equipamento "${hostname}" não encontrado. Regista-o primeiro em Equipamentos.`, code: "EQUIPMENT_NOT_FOUND" },
      { status: 404 }
    );
  }

  const scan = await recordEquipmentCheckpoint({
    equipmentId: equipment.id,
    checkpointId: checkpoint.id,
    userId,
    manual: isManual,
    notes,
  });

  return NextResponse.json(
    {
      type: "equipment" as const,
      id: scan.id,
      timestamp: scan.timestamp.toISOString(),
      notes: scan.notes,
      manual: scan.manual,
      equipment: { id: equipment.id, hostname: equipment.hostname },
      checkpoint: { id: checkpoint.id, name: checkpoint.name, order: checkpoint.order },
      user: { id: session.user.id, name: session.user.name },
    },
    { status: 201 }
  );
}
