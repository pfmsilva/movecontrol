import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPalletDTO, PALLET_ITEM_INCLUDE } from "@/lib/serialize";
import { PALLET_QR_PREFIX } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import PalletItemsManager from "@/components/PalletItemsManager";
import PalletHistory from "@/components/PalletHistory";
import StatusBadge from "@/components/StatusBadge";
import ManualCheckpointControl from "@/components/ManualCheckpointControl";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function PalletDetailPage({ params }: Props) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);

  const [pallet, maxOrderCp] = await Promise.all([
    prisma.pallet.findUnique({ where: { code: decoded }, include: PALLET_ITEM_INCLUDE }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);
  if (!pallet) notFound();

  const dto = toPalletDTO(pallet, maxOrderCp?.order ?? null);

  return (
    <div className="space-y-6">
      <Link href="/pallets" className="text-sm text-brand-600 hover:underline">
        ← Voltar a Paletes
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{dto.code}</h1>
              <StatusBadge status={dto.status} />
            </div>
            {dto.label && <p className="text-gray-600">{dto.label}</p>}
            {dto.notes && <p className="mt-1 text-sm text-gray-500">{dto.notes}</p>}
            <p className="mt-2 text-xs text-gray-400">
              Localização atual: {dto.currentCheckpoint ? dto.currentCheckpoint.name : "Pendente"}
            </p>
          </div>

          <ManualCheckpointControl target={{ palletCode: dto.code }} />

          <PalletItemsManager pallet={dto} />

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Histórico da Palete</h2>
            <PalletHistory events={dto.events} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-20 lg:self-start">
          <p className="self-start text-sm font-semibold text-gray-900">QR Code da Palete</p>
          <QRCodeDisplay value={`${PALLET_QR_PREFIX}${dto.code}`} size={200} showDownload />
          <Link
            href={`/pallets/${encodeURIComponent(dto.code)}/print`}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
          >
            Abrir Vista de Impressão
          </Link>
        </div>
      </div>
    </div>
  );
}
