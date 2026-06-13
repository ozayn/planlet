-- CreateTable
CREATE TABLE "TherapyThought" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapyThought_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TherapyThought_userId_createdAt_idx" ON "TherapyThought"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TherapyThought_planId_createdAt_idx" ON "TherapyThought"("planId", "createdAt");

-- AddForeignKey
ALTER TABLE "TherapyThought" ADD CONSTRAINT "TherapyThought_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyThought" ADD CONSTRAINT "TherapyThought_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
