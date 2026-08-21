import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageEquipment } from "@/lib/permissions";
import { parseEquipmentImport, type ImportRow, type ImportRowError } from "@/lib/excel";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Nenhum ficheiro enviado." }, { status: 400 });
  }

  let rows: ImportRow[];
  let errors: ImportRowError[];
  try {
    const arrayBuffer = await file.arrayBuffer();
    ({ rows, errors } = await parseEquipmentImport(arrayBuffer));
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o ficheiro. Confirma que é um .xlsx válido." },
      { status: 400 }
    );
  }

  if (rows.length === 0 && errors.length === 0) {
    return NextResponse.json(
      { error: `O ficheiro não tem nenhuma linha com "Hostname (ID Único)" preenchido.` },
      { status: 400 }
    );
  }

  let created = 0;
  let updated = 0;
  const rowErrors: ImportRowError[] = [...errors];

  for (const row of rows) {
    try {
      const existing = await prisma.equipment.findUnique({ where: { hostname: row.hostname } });
      await prisma.equipment.upsert({
        where: { hostname: row.hostname },
        create: {
          hostname: row.hostname,
          model: row.model,
          serialNumber: row.serialNumber,
          notes: row.notes,
        },
        // Uma célula em branco mantém o valor já existente — não apaga dados
        // sem intenção explícita numa importação parcial.
        update: {
          ...(row.model !== null ? { model: row.model } : {}),
          ...(row.serialNumber !== null ? { serialNumber: row.serialNumber } : {}),
          ...(row.notes !== null ? { notes: row.notes } : {}),
        },
      });
      if (existing) updated++;
      else created++;
    } catch (err) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `Erro ao guardar "${row.hostname}": ${err instanceof Error ? err.message : "erro desconhecido"}`,
      });
    }
  }

  return NextResponse.json({ created, updated, errors: rowErrors });
}
