-- CreateTable
CREATE TABLE "CoachingNarrationCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "contentProfileVersion" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "narrationStyle" TEXT NOT NULL,
    "instructionVersion" INTEGER NOT NULL,
    "readAloudSectionId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "sectionLabel" TEXT,
    "storageKey" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingNarrationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachingNarrationCache_cacheKey_key" ON "CoachingNarrationCache"("cacheKey");

-- CreateIndex
CREATE INDEX "CoachingNarrationCache_userId_contentHash_idx" ON "CoachingNarrationCache"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "CoachingNarrationCache_userId_model_voice_instructionVersion_idx" ON "CoachingNarrationCache"("userId", "model", "voice", "instructionVersion");

-- AddForeignKey
ALTER TABLE "CoachingNarrationCache" ADD CONSTRAINT "CoachingNarrationCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
