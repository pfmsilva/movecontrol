import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toEquipmentDTO, EQUIPMENT_INCLUDE } from "@/lib/serialize";
import { auth } from "@/auth";
import { canManageEquipment } from "@/lib/permissions";
import type { PortType } from "@prisma/client";

interface Params {
  params: Promise<{ hostname: string }>;
}

const FORM_FIELDS = [
  "model",
  "serialNumber",
  "notes",
  "wave",
  "equipmentType",
  "manufacturer",
  "assetTag",
  "kvm",
  "powerCables",
  "specialCables",
  "arms",
  "powerLocation",
  "cableConnection",
  "rails",
  "originDatacenter",
  "originEp",
  "originIsland",
  "originRack",
  "originPosition",
  "destinationDatacenter",
  "destinationIpTelecom",
  "destinationIsland",
  "destinationRack",
  "destinationPosition",
] as const;

const VALID_PORT_TYPES: PortType[] = ["RJ45", "FIBRA", "OUTRAS"];

interface PortInput {
  portType?: PortType | null;
  etiquetaOrigem?: string | null;
  portaEtiquetaDestino?: string | null;
  patchPanelOrigem?: string | null;
  patchPanelDestino?: string | null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);

  const [equipment, maxOrderCp] = await Promise.all([
    prisma.equipment.findUnique({
      where: { hostname: decoded },
      include: {
        scans: { include: { checkpoint: true, user: true }, orderBy: { timestamp: "desc" } },
        ports: true,
      },
    }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);

  if (!equipment) {
    return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json(toEquipmentDTO(equipment, maxOrderCp?.order ?? null, { includeHistory: true }));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);
  const body = await req.json();

  const data: Record<string, string | null> = {};
  for (const field of FORM_FIELDS) {
    if (body[field] !== undefined) {
      const value = body[field];
      data[field] = typeof value === "string" ? value.trim() || null : null;
    }
  }

  const ports: PortInput[] | undefined = Array.isArray(body.ports) ? body.ports : undefined;
  if (ports) {
    for (const p of ports) {
      if (p.portType != null && !VALID_PORT_TYPES.includes(p.portType)) {
        return NextResponse.json({ error: "Tipo de porta inválido." }, { status: 400 });
      }
    }
  }

  try {
    const equipment = await prisma.equipment.update({
      where: { hostname: decoded },
      data: {
        ...data,
        ...(ports
          ? {
              ports: {
                deleteMany: {},
                create: ports.map((p, i) => ({
                  order: i + 1,
                  portType: p.portType || null,
                  etiquetaOrigem: p.etiquetaOrigem?.trim() || null,
                  portaEtiquetaDestino: p.portaEtiquetaDestino?.trim() || null,
                  patchPanelOrigem: p.patchPanelOrigem?.trim() || null,
                  patchPanelDestino: p.patchPanelDestino?.trim() || null,
                })),
              },
            }
          : {}),
      },
      include: EQUIPMENT_INCLUDE,
    });
    return NextResponse.json(toEquipmentDTO(equipment, null));
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o equipamento." }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || !canManageEquipment(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);
  try {
    await prisma.equipment.delete({ where: { hostname: decoded } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível eliminar o equipamento." }, { status: 400 });
  }
}
