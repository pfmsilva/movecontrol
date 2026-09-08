import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canArchiveEquipment } from "@/lib/permissions";

/**
 * Arquiva (ou restaura) vários equipamentos de uma só vez — ex: selecionados
 * na listagem de Equipamentos. Reservado a ADMIN.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canArchiveEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { hostnames } = body ?? {};
  const archived = body?.archived !== false; // por omissão, arquiva

  const hostnameList: string[] = Array.isArray(hostnames) ? hostnames.filter((h) => typeof h === "string") : [];
  if (hostnameList.length === 0) {
    return NextResponse.json({ error: "Seleciona pelo menos um equipamento." }, { status: 400 });
  }

  const archivedList: string[] = [];
  const errors: { target: string; message: string }[] = [];

  for (const hostname of hostnameList) {
    try {
      await prisma.equipment.update({
        where: { hostname },
        data: { archived, archivedAt: archived ? new Date() : null },
      });
      archivedList.push(hostname);
    } catch {
      errors.push({ target: hostname, message: "Equipamento não encontrado." });
    }
  }

  return NextResponse.json(
    { archived: archivedList, errors },
    { status: archivedList.length > 0 ? 200 : 400 }
  );
}
