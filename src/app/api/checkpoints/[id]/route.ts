import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, order, description } = body ?? {};

  try {
    const checkpoint = await prisma.checkpoint.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(order !== undefined ? { order: Number(order) } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
      },
    });
    return NextResponse.json(checkpoint);
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o checkpoint." }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const scanCount = await prisma.scanEvent.count({ where: { checkpointId: id } });
    if (scanCount > 0) {
      return NextResponse.json(
        { error: "Este checkpoint já tem scans associados e não pode ser eliminado." },
        { status: 409 }
      );
    }
    await prisma.checkpoint.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível eliminar o checkpoint." }, { status: 400 });
  }
}
