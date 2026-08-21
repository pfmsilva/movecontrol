import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Checkpoints por omissão do processo de migração
  const checkpointsData = [
    { name: "Saída Datacenter Origem", order: 1, description: "Equipamento desligado e preparado para transporte." },
    { name: "Em Trânsito", order: 2, description: "Equipamento a caminho do datacenter de destino." },
    { name: "Chegada Datacenter Destino", order: 3, description: "Equipamento recebido nas instalações de destino." },
    { name: "Instalado no Rack Destino", order: 4, description: "Equipamento montado, cablado e ligado no rack final." },
  ];

  for (const cp of checkpointsData) {
    await prisma.checkpoint.upsert({
      where: { order: cp.order },
      update: { name: cp.name, description: cp.description },
      create: cp,
    });
  }

  // Utilizadores de exemplo
  const usersData = [
    { name: "Paulo Silva", email: "paulo.martins.silva@gmail.com" },
    { name: "Equipa Datacenter", email: null },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { name: u.name },
      update: {},
      create: u,
    });
  }

  // Alguns equipamentos de exemplo, para já sem histórico de scans
  const equipmentData = [
    { hostname: "SRV-DB-001", model: "Dell PowerEdge R740", serialNumber: "SN-0001" },
    { hostname: "SRV-APP-014", model: "HPE ProLiant DL380", serialNumber: "SN-0014" },
    { hostname: "SW-CORE-02", model: "Cisco Nexus 9300", serialNumber: "SN-0099" },
  ];

  for (const eq of equipmentData) {
    await prisma.equipment.upsert({
      where: { hostname: eq.hostname },
      update: {},
      create: eq,
    });
  }

  console.log("Seed concluído: checkpoints, utilizadores e equipamentos de exemplo criados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
