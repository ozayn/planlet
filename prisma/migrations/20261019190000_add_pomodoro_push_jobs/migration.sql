-- CreateTable
CREATE TABLE "PomodoroPushJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "transitionToken" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PomodoroPushJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PomodoroPushJob_transitionToken_key" ON "PomodoroPushJob"("transitionToken");

-- CreateIndex
CREATE INDEX "PomodoroPushJob_status_sendAt_idx" ON "PomodoroPushJob"("status", "sendAt");

-- CreateIndex
CREATE INDEX "PomodoroPushJob_userId_status_idx" ON "PomodoroPushJob"("userId", "status");

-- AddForeignKey
ALTER TABLE "PomodoroPushJob" ADD CONSTRAINT "PomodoroPushJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
