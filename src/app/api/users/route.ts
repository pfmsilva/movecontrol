import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";
import { toUserDTO } from "@/lib/serialize";
import type { Role } from "@prisma/client";

const VALID_ROLES: Role[] = ["ADMIN", "CONTROLLER", "VALIDATOR"];

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: { validatorCheckpoints: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users.map(toUserDTO));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, validatorCheckpointIds } = body ?? {};

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "A password deve ter pelo menos 8 caracteres." }, { status: 400 });
  }
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Role inválida." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword(password),
        role: role ?? "VALIDATOR",
        ...(Array.isArray(validatorCheckpointIds) && validatorCheckpointIds.length > 0
          ? { validatorCheckpoints: { connect: validatorCheckpointIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: { validatorCheckpoints: true },
    });
    return NextResponse.json(toUserDTO(user), { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Já existe um utilizador com esse email." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar utilizador." }, { status: 500 });
  }
}
