-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Equipment_archived_idx" ON "Equipment"("archived");
