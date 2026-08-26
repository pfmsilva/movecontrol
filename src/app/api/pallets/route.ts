import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManagePallets } from "@/lib/permissions";
import { toPalletSummaryDTO, toPalletDTO, PALLET_SUMMARY_INCLUDE, PALLET_ITEM_INCLUDE } from "@/lib/serialize";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const pallets = await prisma.pallet.findMany({
    include: PALLET_SUMMARY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pallets.map(toPalletSummaryDTO));
}

async function generatePalletCode(): Promise<string> {
  const existing = await prisma.pallet.findMany({
    where: { code: { startsWith: "PAL-" } },
    select: { code: true },
  });
  let max = 0;
  for (const { code } of existing) {
    const n = Number(code.slice(4));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `PAL-${String(max + 1).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManagePallets(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  const { label, notes, equipmentHostnames } = body ?? {};

  const hostnames: string[] = Array.isArray(equipmentHostnames) ? equipmentHostnames : [];
  let equipmentIds: string[] = [];
  if (hostnames.length > 0) {
    const equipment = await prisma.equipment.findMany({
      where: { hostname: { in: hostnames } },
      select: { id: true, hostname: true },
    });
    const found = new Set(equipment.map((e) => e.hostname));
    const missing = hostnames.filter((h) => !found.has(h));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Equipamento(s) não encontrado(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    equipmentIds = equipment.map((e) => e.id);
  }

  // Pequeno retry para o caso raro de colisão do código gerado.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await generatePalletCode();
    try {
      const pallet = await prisma.pallet.create({
        data: {
          code,
          label: label?.trim() || null,
          notes: notes?.trim() || null,
          items: { create: equipmentIds.map((equipmentId) => ({ equipmentId })) },
        },
        include: PALLET_ITEM_INCLUDE,
      });
      return NextResponse.json(toPalletDTO(pallet, null), { status: 201 });
    } catch (err: unknown) {
      const isConflict =
        typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
      if (isConflict && attempt < 4) continue;
      return NextResponse.json({ error: "Erro ao criar palete." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Erro ao gerar código único para a palete." }, { status: 500 });
}
