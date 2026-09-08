import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageEquipment, canArchiveEquipment } from "@/lib/permissions";

/**
 * Elimina definitivamente vários equipamentos de uma só vez — ex: selecionados
 * no separador de Arquivo. Equipamento arquivado só pode ser eliminado por ADMIN
 * (mesma regra do DELETE individual).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { hostnames } = body ?? {};
  const hostnameList: string[] = Array.isArray(hostnames) ? hostnames.filter((h) => typeof h === "string") : [];
  if (hostnameList.length === 0) {
    return NextResponse.json({ error: "Seleciona pelo menos um equipamento." }, { status: 400 });
  }

  const deleted: string[] = [];
  const errors: { target: string; message: string }[] = [];

  for (const hostname of hostnameList) {
    const existing = await prisma.equipment.findUnique({ where: { hostname }, select: { archived: true } });
    if (!existing) {
      errors.push({ target: hostname, message: "Equipamento não encontrado." });
      continue;
    }
    if (existing.archived && !canArchiveEquipment(session.user.role)) {
      errors.push({ target: hostname, message: "Não autorizado." });
      continue;
    }
    try {
      await prisma.equipment.delete({ where: { hostname } });
      deleted.push(hostname);
    } catch {
      errors.push({ target: hostname, message: "Não foi possível eliminar." });
    }
  }

  return NextResponse.json({ deleted, errors }, { status: deleted.length > 0 ? 200 : 400 });
}
