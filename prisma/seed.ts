import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function main() {
  // Checkpoints por omissão do processo de migração
  const checkpointsData = [
    { name: "Saída Datacenter Origem", order: 1, description: "Equipamento desligado e preparado para transporte." },
    { name: "Em Trânsito", order: 2, description: "Equipamento a caminho do datacenter de destino." },
    { name: "Chegada Datacenter Destino", order: 3, description: "Equipamento recebido nas instalações de destino." },
    { name: "Instalado no Rack Destino", order: 4, description: "Equipamento montado, cablado e ligado no rack final." },
  ];

  const checkpoints: Record<number, { id: string }> = {};
  for (const cp of checkpointsData) {
    const created = await prisma.checkpoint.upsert({
      where: { order: cp.order },
      update: { name: cp.name, description: cp.description },
      create: cp,
    });
    checkpoints[cp.order] = created;
  }

  // Utilizadores de exemplo — um por cada role.
  // ⚠️ Muda estas passwords antes de ires para produção.
  const usersData = [
    {
      name: "Administrador",
      email: "admin@movecontrol.local",
      password: "Admin123!",
      role: "ADMIN" as const,
      validatorCheckpointOrders: [] as number[],
    },
    {
      name: "Controlador Geral",
      email: "controlador@movecontrol.local",
      password: "Controlador123!",
      role: "CONTROLLER" as const,
      validatorCheckpointOrders: [],
    },
    {
      name: "Validador Origem",
      email: "validador.origem@movecontrol.local",
      password: "Validador123!",
      role: "VALIDATOR" as const,
      validatorCheckpointOrders: [1, 2],
    },
    {
      name: "Validador Destino",
      email: "validador.destino@movecontrol.local",
      password: "Validador123!",
      role: "VALIDATOR" as const,
      validatorCheckpointOrders: [3, 4],
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        validatorCheckpoints: {
          set: u.validatorCheckpointOrders.map((o) => ({ id: checkpoints[o].id })),
        },
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: await hash(u.password),
        role: u.role,
        validatorCheckpoints: {
          connect: u.validatorCheckpointOrders.map((o) => ({ id: checkpoints[o].id })),
        },
      },
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

  console.log("Seed concluído: checkpoints, utilizadores (com roles) e equipamentos de exemplo criados.");
  console.log("Credenciais de exemplo:");
  for (const u of usersData) {
    console.log(`  - ${u.role.padEnd(10)} ${u.email} / ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
