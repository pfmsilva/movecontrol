import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checkpoints = await prisma.checkpoint.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(checkpoints);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, order, description } = body ?? {};

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "O nome do checkpoint é obrigatório." }, { status: 400 });
  }
  if (order == null || Number.isNaN(Number(order))) {
    return NextResponse.json({ error: "A ordem do checkpoint é obrigatória e deve ser numérica." }, { status: 400 });
  }

  try {
    const checkpoint = await prisma.checkpoint.create({
      data: {
        name: name.trim(),
        order: Number(order),
        description: description?.trim() || null,
      },
    });
    return NextResponse.json(checkpoint, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Já existe um checkpoint com essa ordem." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar checkpoint." }, { status: 500 });
  }
}
