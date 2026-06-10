-- CreateEnum
CREATE TYPE "ObservationCategory" AS ENUM ('MIND', 'EMOTION', 'BODY', 'CYCLE', 'PAIN', 'SKIN', 'SLEEP', 'ENERGY', 'OTHER');

-- CreateTable
CREATE TABLE "PlanObservation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ObservationCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanObservation_planId_createdAt_idx" ON "PlanObservation"("planId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanObservation_userId_createdAt_idx" ON "PlanObservation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanObservation_userId_category_createdAt_idx" ON "PlanObservation"("userId", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "PlanObservation" ADD CONSTRAINT "PlanObservation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanObservation" ADD CONSTRAINT "PlanObservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
