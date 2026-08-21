import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toEquipmentDTO } from "@/lib/serialize";
import StatusBadge from "@/components/StatusBadge";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import MovementTimeline from "@/components/MovementTimeline";
import EquipmentFichaCard from "@/components/EquipmentFichaCard";

interface Props {
  params: Promise<{ hostname: string }>;
}

export default async function EquipmentDetailPage({ params }: Props) {
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

  if (!equipment) notFound();

  const dto = toEquipmentDTO(equipment, maxOrderCp?.order ?? null, { includeHistory: true });

  return (
    <div className="space-y-6">
      <Link href="/equipment" className="text-sm text-brand-600 hover:underline">
        ← Voltar a Equipamentos
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{dto.hostname}</h1>
              <StatusBadge status={dto.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-gray-400">Modelo</dt>
                <dd className="text-gray-700">{dto.model ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Wave</dt>
                <dd className="text-gray-700">{dto.wave ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Localização Atual</dt>
                <dd className="text-gray-700">{dto.currentCheckpoint?.name ?? "Pendente"}</dd>
              </div>
            </dl>

            <h2 className="mb-3 mt-8 text-sm font-semibold text-gray-900">Timeline de Movimentação</h2>
            <MovementTimeline scans={dto.scans ?? []} />
          </div>

          <EquipmentFichaCard equipment={dto} />
        </div>

        <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-20 lg:self-start">
          <p className="self-start text-sm font-semibold text-gray-900">QR Code do Equipamento</p>
          <QRCodeDisplay value={dto.hostname} size={200} showDownload />
          <Link
            href={`/equipment/${encodeURIComponent(dto.hostname)}/print`}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
          >
            Abrir Vista de Impressão
          </Link>
        </div>
      </div>
    </div>
  );
}
