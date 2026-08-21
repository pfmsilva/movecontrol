import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { toEquipmentDTO, EQUIPMENT_INCLUDE } from "@/lib/serialize";
import { buildEquipmentExport } from "@/lib/excel";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const [equipment, maxOrderCp] = await Promise.all([
    prisma.equipment.findMany({
      include: EQUIPMENT_INCLUDE,
      orderBy: { hostname: "asc" },
    }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);
  const maxOrder = maxOrderCp?.order ?? null;
  const dtos = equipment.map((eq) => toEquipmentDTO(eq, maxOrder));

  const buffer = await buildEquipmentExport(dtos);
  const filename = `movecontrol-equipamentos-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
