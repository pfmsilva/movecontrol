import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deriveStatus } from "@/lib/utils";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const [equipment, checkpoints] = await Promise.all([
    prisma.equipment.findMany({
      include: {
        scans: {
          include: { checkpoint: true },
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    }),
    prisma.checkpoint.findMany({ orderBy: { order: "asc" } }),
  ]);

  const maxOrder = checkpoints.length ? checkpoints[checkpoints.length - 1].order : null;

  let pending = 0;
  let inTransit = 0;
  let completed = 0;
  const perCheckpointCount = new Map<string, number>();

  for (const eq of equipment) {
    const last = eq.scans[0] ?? null;
    const status = deriveStatus(last?.checkpoint.order ?? null, maxOrder);
    if (status === "pending") pending++;
    else if (status === "completed") completed++;
    else inTransit++;

    if (last) {
      perCheckpointCount.set(last.checkpoint.id, (perCheckpointCount.get(last.checkpoint.id) ?? 0) + 1);
    }
  }

  const total = equipment.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

  return NextResponse.json({
    total,
    pending,
    inTransit,
    completed,
    pendingPct: pct(pending),
    inTransitPct: pct(inTransit),
    completedPct: pct(completed),
    perCheckpoint: checkpoints.map((cp) => ({
      checkpoint: {
        id: cp.id,
        name: cp.name,
        order: cp.order,
        description: cp.description,
        createdAt: cp.createdAt.toISOString(),
      },
      count: perCheckpointCount.get(cp.id) ?? 0,
    })),
  });
}
