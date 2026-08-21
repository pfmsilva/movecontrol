import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toEquipmentDTO, EQUIPMENT_INCLUDE } from "@/lib/serialize";
import PrintView from "@/components/PrintView";

interface Props {
  params: Promise<{ hostname: string }>;
}

export default async function PrintPage({ params }: Props) {
  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);

  const [equipment, maxOrderCp] = await Promise.all([
    prisma.equipment.findUnique({ where: { hostname: decoded }, include: EQUIPMENT_INCLUDE }),
    prisma.checkpoint.findFirst({ orderBy: { order: "desc" } }),
  ]);
  if (!equipment) notFound();

  const dto = toEquipmentDTO(equipment, maxOrderCp?.order ?? null);

  return (
    <div>
      <Link href={`/equipment/${encodeURIComponent(equipment.hostname)}`} className="no-print mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Voltar ao equipamento
      </Link>
      <PrintView equipment={dto} />
    </div>
  );
}
