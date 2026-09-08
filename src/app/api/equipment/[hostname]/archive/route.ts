import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toEquipmentDTO, EQUIPMENT_INCLUDE } from "@/lib/serialize";
import { auth } from "@/auth";
import { canArchiveEquipment } from "@/lib/permissions";

interface Params {
  params: Promise<{ hostname: string }>;
}

/** Arquiva ou desarquiva um equipamento. Só ADMIN. */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canArchiveEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);
  const body = await req.json().catch(() => ({}));
  const archived = body?.archived !== false; // por omissão, arquiva

  try {
    const equipment = await prisma.equipment.update({
      where: { hostname: decoded },
      data: { archived, archivedAt: archived ? new Date() : null },
      include: EQUIPMENT_INCLUDE,
    });
    return NextResponse.json(toEquipmentDTO(equipment, null));
  } catch {
    return NextResponse.json(
      { error: archived ? "Não foi possível arquivar o equipamento." : "Não foi possível restaurar o equipamento." },
      { status: 400 }
    );
  }
}
