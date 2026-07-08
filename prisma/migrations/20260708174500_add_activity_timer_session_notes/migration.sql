-- CreateTable
CREATE TABLE "ActivityTimerSessionNote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "offsetSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTimerSessionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityTimerSessionNote_sessionId_recordedAt_idx" ON "ActivityTimerSessionNote"("sessionId", "recordedAt");

-- CreateIndex
CREATE INDEX "ActivityTimerSessionNote_userId_recordedAt_idx" ON "ActivityTimerSessionNote"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "ActivityTimerSessionNote" ADD CONSTRAINT "ActivityTimerSessionNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivityTimerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityTimerSessionNote" ADD CONSTRAINT "ActivityTimerSessionNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
