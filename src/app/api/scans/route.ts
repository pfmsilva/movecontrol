import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isRestrictedValidator } from "@/lib/permissions";

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
  const { hostname, checkpointId, notes } = body ?? {};
  // O utilizador responsável é sempre o da sessão autenticada — nunca confiar
  // num userId vindo do cliente.
  const userId = session.user.id;

  if (!hostname || typeof hostname !== "string") {
    return NextResponse.json({ error: "ID do equipamento (hostname) em falta no QR Code." }, { status: 400 });
  }
  if (!checkpointId) {
    return NextResponse.json({ error: "Seleciona o ponto de controlo (checkpoint) atual." }, { status: 400 });
  }

  const equipment = await prisma.equipment.findUnique({ where: { hostname: hostname.trim() } });
  if (!equipment) {
    return NextResponse.json(
      { error: `Equipamento "${hostname}" não encontrado. Regista-o primeiro em Equipamentos.`, code: "EQUIPMENT_NOT_FOUND" },
      { status: 404 }
    );
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

  const scan = await prisma.scanEvent.create({
    data: {
      equipmentId: equipment.id,
      checkpointId: checkpoint.id,
      userId,
      notes: notes?.trim() || null,
    },
    include: { checkpoint: true, user: true, equipment: true },
  });

  return NextResponse.json(
    {
      id: scan.id,
      timestamp: scan.timestamp.toISOString(),
      notes: scan.notes,
      equipment: { id: scan.equipment.id, hostname: scan.equipment.hostname },
      checkpoint: { id: scan.checkpoint.id, name: scan.checkpoint.name, order: scan.checkpoint.order },
      user: { id: scan.user.id, name: scan.user.name },
    },
    { status: 201 }
  );
}
