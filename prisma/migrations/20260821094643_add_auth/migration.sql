-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostname" TEXT NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VALIDATOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanEvent_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ValidatorCheckpoints" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ValidatorCheckpoints_A_fkey" FOREIGN KEY ("A") REFERENCES "Checkpoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ValidatorCheckpoints_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_hostname_key" ON "Equipment"("hostname");

-- CreateIndex
CREATE INDEX "Equipment_hostname_idx" ON "Equipment"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "Checkpoint_order_key" ON "Checkpoint"("order");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ScanEvent_equipmentId_idx" ON "ScanEvent"("equipmentId");

-- CreateIndex
CREATE INDEX "ScanEvent_checkpointId_idx" ON "ScanEvent"("checkpointId");

-- CreateIndex
CREATE INDEX "ScanEvent_timestamp_idx" ON "ScanEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "_ValidatorCheckpoints_AB_unique" ON "_ValidatorCheckpoints"("A", "B");

-- CreateIndex
CREATE INDEX "_ValidatorCheckpoints_B_index" ON "_ValidatorCheckpoints"("B");
