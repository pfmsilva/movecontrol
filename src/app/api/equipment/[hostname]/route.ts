import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toEquipmentDTO } from "@/lib/serialize";
import { auth } from "@/auth";
import { canManageEquipment } from "@/lib/permissions";

interface Params {
  params: Promise<{ hostname: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);

  const [equipment, maxOrderCp] = await Promise.all([
    prisma.equipment.findUnique({
      where: { hostname: decoded },
      include: {
        scans: { include: { checkpoint: true, user: true }, orderBy: { timestamp: "desc" } },
      },
    }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);

  if (!equipment) {
    return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json(toEquipmentDTO(equipment, maxOrderCp?.order ?? null, { includeHistory: true }));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);
  const body = await req.json();
  const { model, serialNumber, notes } = body ?? {};

  try {
    const equipment = await prisma.equipment.update({
      where: { hostname: decoded },
      data: {
        ...(model !== undefined ? { model: model?.trim() || null } : {}),
        ...(serialNumber !== undefined ? { serialNumber: serialNumber?.trim() || null } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
      include: { scans: { include: { checkpoint: true, user: true } } },
    });
    return NextResponse.json(toEquipmentDTO(equipment, null));
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o equipamento." }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);
  try {
    await prisma.equipment.delete({ where: { hostname: decoded } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível eliminar o equipamento." }, { status: 400 });
  }
}
