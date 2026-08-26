import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManagePallets } from "@/lib/permissions";
import { toPalletDTO, PALLET_ITEM_INCLUDE } from "@/lib/serialize";

interface Params {
  params: Promise<{ code: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { code } = await params;
  const decoded = decodeURIComponent(code);

  const [pallet, maxOrderCp] = await Promise.all([
    prisma.pallet.findUnique({ where: { code: decoded }, include: PALLET_ITEM_INCLUDE }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);

  if (!pallet) {
    return NextResponse.json({ error: "Palete não encontrada." }, { status: 404 });
  }

  return NextResponse.json(toPalletDTO(pallet, maxOrderCp?.order ?? null));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManagePallets(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const body = await req.json();
  const { label, notes, equipmentHostnames } = body ?? {};

  const existing = await prisma.pallet.findUnique({ where: { code: decoded } });
  if (!existing) {
    return NextResponse.json({ error: "Palete não encontrada." }, { status: 404 });
  }

  let itemsUpdate = {};
  if (Array.isArray(equipmentHostnames)) {
    const equipment = await prisma.equipment.findMany({
      where: { hostname: { in: equipmentHostnames } },
      select: { id: true, hostname: true },
    });
    const found = new Set(equipment.map((e) => e.hostname));
    const missing = equipmentHostnames.filter((h: string) => !found.has(h));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Equipamento(s) não encontrado(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    itemsUpdate = {
      items: {
        deleteMany: {},
        create: equipment.map((e) => ({ equipmentId: e.id })),
      },
    };
  }

  try {
    const pallet = await prisma.pallet.update({
      where: { code: decoded },
      data: {
        ...(label !== undefined ? { label: label?.trim() || null } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        ...itemsUpdate,
      },
      include: PALLET_ITEM_INCLUDE,
    });
    return NextResponse.json(toPalletDTO(pallet, null));
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a palete." }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManagePallets(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { code } = await params;
  const decoded = decodeURIComponent(code);
  try {
    await prisma.pallet.delete({ where: { code: decoded } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível eliminar a palete." }, { status: 400 });
  }
}
