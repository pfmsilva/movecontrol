-- AlterTable
ALTER TABLE "ScanEvent" ADD COLUMN     "palletId" TEXT;

-- CreateTable
CREATE TABLE "Pallet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PalletItem" (
    "id" TEXT NOT NULL,
    "palletId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PalletItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pallet_code_key" ON "Pallet"("code");

-- CreateIndex
CREATE INDEX "Pallet_code_idx" ON "Pallet"("code");

-- CreateIndex
CREATE INDEX "PalletItem_palletId_idx" ON "PalletItem"("palletId");

-- CreateIndex
CREATE INDEX "PalletItem_equipmentId_idx" ON "PalletItem"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PalletItem_palletId_equipmentId_key" ON "PalletItem"("palletId", "equipmentId");

-- CreateIndex
CREATE INDEX "ScanEvent_palletId_idx" ON "ScanEvent"("palletId");

-- AddForeignKey
ALTER TABLE "PalletItem" ADD CONSTRAINT "PalletItem_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalletItem" ADD CONSTRAINT "PalletItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
