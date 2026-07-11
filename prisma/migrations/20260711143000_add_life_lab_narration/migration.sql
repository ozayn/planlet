-- CreateEnum
CREATE TYPE "LifeLabReadAloudProvider" AS ENUM ('DEVICE', 'OPENAI');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "lifeLabReadAloudProvider" "LifeLabReadAloudProvider" NOT NULL DEFAULT 'DEVICE',
ADD COLUMN "lifeLabSpeechVoiceId" TEXT,
ADD COLUMN "lifeLabSpeechRate" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "LifeLabNarrationCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "noteModifiedTime" TEXT,
    "contentHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "instructionVersion" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "sectionLabel" TEXT,
    "storageKey" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifeLabNarrationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LifeLabNarrationCache_cacheKey_key" ON "LifeLabNarrationCache"("cacheKey");

-- CreateIndex
CREATE INDEX "LifeLabNarrationCache_driveFileId_model_voice_instructionVersion_idx" ON "LifeLabNarrationCache"("driveFileId", "model", "voice", "instructionVersion");

-- CreateIndex
CREATE INDEX "LifeLabNarrationCache_driveFileId_contentHash_idx" ON "LifeLabNarrationCache"("driveFileId", "contentHash");
