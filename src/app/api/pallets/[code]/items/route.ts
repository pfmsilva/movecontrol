import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManagePallets } from "@/lib/permissions";
import { toPalletDTO, PALLET_ITEM_INCLUDE } from "@/lib/serialize";

interface Params {
  params: Promise<{ code: string }>;
}

async function respond(palletId: string) {
  const [updated, maxOrderCp] = await Promise.all([
    prisma.pallet.findUniqueOrThrow({ where: { id: palletId }, include: PALLET_ITEM_INCLUDE }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);
  return NextResponse.json(toPalletDTO(updated, maxOrderCp?.order ?? null));
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManagePallets(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const { hostname } = (await req.json()) ?? {};

  if (!hostname || typeof hostname !== "string") {
    return NextResponse.json({ error: "Hostname do equipamento em falta." }, { status: 400 });
  }

  const [pallet, equipment] = await Promise.all([
    prisma.pallet.findUnique({ where: { code: decoded } }),
    prisma.equipment.findUnique({ where: { hostname: hostname.trim() } }),
  ]);
  if (!pallet) return NextResponse.json({ error: "Palete não encontrada." }, { status: 404 });
  if (!equipment) {
    return NextResponse.json({ error: `Equipamento "${hostname}" não encontrado.` }, { status: 404 });
  }

  try {
    await prisma.palletItem.create({ data: { palletId: pallet.id, equipmentId: equipment.id } });
    // Regista no log de auditoria — só quando a adição foi mesmo nova (não em conflito).
    await prisma.palletEvent.create({
      data: {
        palletId: pallet.id,
        type: "ITEM_ADDED",
        equipmentId: equipment.id,
        userId: session.user.id,
      },
    });
  } catch (err: unknown) {
    const isConflict =
      typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
    if (!isConflict) {
      return NextResponse.json({ error: "Não foi possível adicionar o equipamento." }, { status: 500 });
    }
    // já estava na palete — ignora silenciosamente
  }

  return respond(pallet.id);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManagePallets(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const { hostname } = (await req.json()) ?? {};

  if (!hostname || typeof hostname !== "string") {
    return NextResponse.json({ error: "Hostname do equipamento em falta." }, { status: 400 });
  }

  const pallet = await prisma.pallet.findUnique({ where: { code: decoded } });
  if (!pallet) return NextResponse.json({ error: "Palete não encontrada." }, { status: 404 });

  const equipment = await prisma.equipment.findUnique({ where: { hostname: hostname.trim() } });
  if (equipment) {
    const { count } = await prisma.palletItem.deleteMany({
      where: { palletId: pallet.id, equipmentId: equipment.id },
    });
    if (count > 0) {
      // Só regista no log se o equipamento era mesmo membro (removeu algo a sério).
      await prisma.palletEvent.create({
        data: {
          palletId: pallet.id,
          type: "ITEM_REMOVED",
          equipmentId: equipment.id,
          userId: session.user.id,
        },
      });
    }
  }

  return respond(pallet.id);
}
