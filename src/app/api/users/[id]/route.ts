import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";
import { toUserDTO } from "@/lib/serialize";
import type { Role } from "@prisma/client";

const VALID_ROLES: Role[] = ["ADMIN", "CONTROLLER", "VALIDATOR"];

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, email, password, role, validatorCheckpointIds } = body ?? {};

  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Role inválida." }, { status: 400 });
  }
  if (password !== undefined && password !== "" && password.length < 8) {
    return NextResponse.json({ error: "A password deve ter pelo menos 8 caracteres." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(email !== undefined ? { email: String(email).trim().toLowerCase() } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(Array.isArray(validatorCheckpointIds)
          ? { validatorCheckpoints: { set: validatorCheckpointIds.map((cid: string) => ({ id: cid })) } }
          : {}),
      },
      include: { validatorCheckpoints: true },
    });
    return NextResponse.json(toUserDTO(user));
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Já existe um utilizador com esse email." }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível atualizar o utilizador." }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Não podes eliminar a tua própria conta." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível eliminar o utilizador." }, { status: 400 });
  }
}
