import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
  const body = await req.json();
  const { hostname, checkpointId, userId, notes } = body ?? {};

  if (!hostname || typeof hostname !== "string") {
    return NextResponse.json({ error: "ID do equipamento (hostname) em falta no QR Code." }, { status: 400 });
  }
  if (!checkpointId) {
    return NextResponse.json({ error: "Seleciona o ponto de controlo (checkpoint) atual." }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Seleciona o utilizador responsável pelo scan." }, { status: 400 });
  }

  const equipment = await prisma.equipment.findUnique({ where: { hostname: hostname.trim() } });
  if (!equipment) {
    return NextResponse.json(
      { error: `Equipamento "${hostname}" não encontrado. Regista-o primeiro em Equipamentos.`, code: "EQUIPMENT_NOT_FOUND" },
      { status: 404 }
    );
  }

  const [checkpoint, user] = await Promise.all([
    prisma.checkpoint.findUnique({ where: { id: checkpointId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint inválido." }, { status: 400 });
  }
  if (!user) {
    return NextResponse.json({ error: "Utilizador inválido." }, { status: 400 });
  }

  const scan = await prisma.scanEvent.create({
    data: {
      equipmentId: equipment.id,
      checkpointId: checkpoint.id,
      userId: user.id,
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
