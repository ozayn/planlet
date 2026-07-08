-- AlterTable
ALTER TABLE "User" ADD COLUMN "canUseActivityTimerFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ActivityTimerPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTimerPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityTimerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "presetId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTimerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityTimerPreset_userId_isArchived_sortOrder_idx" ON "ActivityTimerPreset"("userId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "ActivityTimerSession_userId_startedAt_idx" ON "ActivityTimerSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ActivityTimerSession_userId_stoppedAt_idx" ON "ActivityTimerSession"("userId", "stoppedAt");

-- AddForeignKey
ALTER TABLE "ActivityTimerPreset" ADD CONSTRAINT "ActivityTimerPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimerSession" ADD CONSTRAINT "ActivityTimerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimerSession" ADD CONSTRAINT "ActivityTimerSession_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "ActivityTimerPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
