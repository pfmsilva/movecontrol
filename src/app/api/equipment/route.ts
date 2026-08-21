import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toEquipmentDTO } from "@/lib/serialize";

export async function GET() {
  const [equipment, maxOrderCp] = await Promise.all([
    prisma.equipment.findMany({
      include: { scans: { include: { checkpoint: true, user: true } } },
      orderBy: { hostname: "asc" },
    }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);

  const maxOrder = maxOrderCp?.order ?? null;
  const dtos = equipment.map((eq) => toEquipmentDTO(eq, maxOrder));
  return NextResponse.json(dtos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hostname, model, serialNumber, notes } = body ?? {};

  if (!hostname || typeof hostname !== "string" || hostname.trim().length === 0) {
    return NextResponse.json(
      { error: "O Nome/Hostname (ID Único) do equipamento é obrigatório." },
      { status: 400 }
    );
  }

  try {
    const equipment = await prisma.equipment.create({
      data: {
        hostname: hostname.trim(),
        model: model?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: { scans: { include: { checkpoint: true, user: true } } },
    });
    return NextResponse.json(toEquipmentDTO(equipment, null), { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um equipamento registado com esse Nome/Hostname." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erro ao registar equipamento." }, { status: 500 });
  }
}
