-- CreateEnum
CREATE TYPE "PortType" AS ENUM ('RJ45', 'FIBRA', 'OUTRAS');

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "arms" TEXT,
ADD COLUMN     "assetTag" TEXT,
ADD COLUMN     "cableConnection" TEXT,
ADD COLUMN     "destinationDatacenter" TEXT,
ADD COLUMN     "destinationIpTelecom" TEXT,
ADD COLUMN     "destinationIsland" TEXT,
ADD COLUMN     "destinationPosition" TEXT,
ADD COLUMN     "destinationRack" TEXT,
ADD COLUMN     "equipmentType" TEXT,
ADD COLUMN     "kvm" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "originDatacenter" TEXT,
ADD COLUMN     "originEp" TEXT,
ADD COLUMN     "originIsland" TEXT,
ADD COLUMN     "originPosition" TEXT,
ADD COLUMN     "originRack" TEXT,
ADD COLUMN     "powerCables" TEXT,
ADD COLUMN     "powerLocation" TEXT,
ADD COLUMN     "rails" TEXT,
ADD COLUMN     "specialCables" TEXT,
ADD COLUMN     "wave" TEXT;

-- CreateTable
CREATE TABLE "PortConnection" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "portType" "PortType",
    "etiquetaOrigem" TEXT,
    "portaEtiquetaDestino" TEXT,
    "patchPanelOrigem" TEXT,
    "patchPanelDestino" TEXT,

    CONSTRAINT "PortConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortConnection_equipmentId_idx" ON "PortConnection"("equipmentId");

-- AddForeignKey
ALTER TABLE "PortConnection" ADD CONSTRAINT "PortConnection_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
