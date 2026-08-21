import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email } = body ?? {};

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "O nome do utilizador é obrigatório." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email?.trim() || null },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Já existe um utilizador com esse nome." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar utilizador." }, { status: 500 });
  }
}
