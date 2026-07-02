-- CreateTable
CREATE TABLE "PlanItemReflection" (
  "id" TEXT NOT NULL,
  "planItemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlanItemReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanItemReflection_planItemId_createdAt_idx" ON "PlanItemReflection"("planItemId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanItemReflection_userId_createdAt_idx" ON "PlanItemReflection"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlanItemReflection" ADD CONSTRAINT "PlanItemReflection_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemReflection" ADD CONSTRAINT "PlanItemReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
