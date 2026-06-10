-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'REFLECTOR';

-- CreateTable
CREATE TABLE "PlanGratitude" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanGratitude_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanGratitude_planId_createdAt_idx" ON "PlanGratitude"("planId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanGratitude_userId_createdAt_idx" ON "PlanGratitude"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlanGratitude" ADD CONSTRAINT "PlanGratitude_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanGratitude" ADD CONSTRAINT "PlanGratitude_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
