-- AlterTable
ALTER TABLE "PalletEvent" ADD COLUMN     "manual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ScanEvent" ADD COLUMN     "manual" BOOLEAN NOT NULL DEFAULT false;
