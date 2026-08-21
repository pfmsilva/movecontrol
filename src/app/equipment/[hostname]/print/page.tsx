import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintView from "@/components/PrintView";

interface Props {
  params: Promise<{ hostname: string }>;
}

export default async function PrintPage({ params }: Props) {
  const { hostname } = await params;
  const decoded = decodeURIComponent(hostname);

  const equipment = await prisma.equipment.findUnique({ where: { hostname: decoded } });
  if (!equipment) notFound();

  return (
    <div>
      <Link href={`/equipment/${encodeURIComponent(equipment.hostname)}`} className="no-print mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Voltar ao equipamento
      </Link>
      <PrintView hostname={equipment.hostname} model={equipment.model} />
    </div>
  );
}
