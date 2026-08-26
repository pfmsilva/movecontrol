import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPalletDTO, PALLET_ITEM_INCLUDE } from "@/lib/serialize";
import PalletPrintView from "@/components/PalletPrintView";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function PalletPrintPage({ params }: Props) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);

  const [pallet, maxOrderCp] = await Promise.all([
    prisma.pallet.findUnique({ where: { code: decoded }, include: PALLET_ITEM_INCLUDE }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);
  if (!pallet) notFound();

  const dto = toPalletDTO(pallet, maxOrderCp?.order ?? null);

  return (
    <div>
      <Link href={`/pallets/${encodeURIComponent(dto.code)}`} className="no-print mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Voltar à palete
      </Link>
      <PalletPrintView pallet={dto} />
    </div>
  );
}
