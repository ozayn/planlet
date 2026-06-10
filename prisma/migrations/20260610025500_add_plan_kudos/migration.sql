-- CreateEnum
CREATE TYPE "KudosType" AS ENUM ('CHEER', 'PROUD', 'ROOTING', 'WARMTH');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PLAN_KUDOS';

-- CreateTable
CREATE TABLE "PlanKudos" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "KudosType" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanKudos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanKudos_planId_idx" ON "PlanKudos"("planId");

-- CreateIndex
CREATE INDEX "PlanKudos_senderId_idx" ON "PlanKudos"("senderId");

-- CreateIndex
CREATE INDEX "PlanKudos_recipientId_idx" ON "PlanKudos"("recipientId");

-- CreateIndex
CREATE INDEX "PlanKudos_createdAt_idx" ON "PlanKudos"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanKudos_planId_senderId_key" ON "PlanKudos"("planId", "senderId");

-- AddForeignKey
ALTER TABLE "PlanKudos" ADD CONSTRAINT "PlanKudos_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanKudos" ADD CONSTRAINT "PlanKudos_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanKudos" ADD CONSTRAINT "PlanKudos_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
