-- CreateEnum
CREATE TYPE "PalletEventType" AS ENUM ('ITEM_ADDED', 'ITEM_REMOVED', 'CHECKPOINT_SCAN');

-- CreateTable
CREATE TABLE "PalletEvent" (
    "id" TEXT NOT NULL,
    "palletId" TEXT NOT NULL,
    "type" "PalletEventType" NOT NULL,
    "equipmentId" TEXT,
    "checkpointId" TEXT,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PalletEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PalletEvent_palletId_idx" ON "PalletEvent"("palletId");

-- CreateIndex
CREATE INDEX "PalletEvent_timestamp_idx" ON "PalletEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "PalletEvent" ADD CONSTRAINT "PalletEvent_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "Pallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalletEvent" ADD CONSTRAINT "PalletEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalletEvent" ADD CONSTRAINT "PalletEvent_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalletEvent" ADD CONSTRAINT "PalletEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
