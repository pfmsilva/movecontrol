import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildImportTemplate } from "@/lib/excel";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const buffer = await buildImportTemplate();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="movecontrol-template-importacao.xlsx"',
    },
  });
}
