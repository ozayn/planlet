-- CreateEnum
CREATE TYPE "PlanOrganizeView" AS ENUM ('LIST', 'LIFE_AREAS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "planOrganizeView" "PlanOrganizeView" NOT NULL DEFAULT 'LIST';

-- CreateTable
CREATE TABLE "LifeArea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItemLifeArea" (
    "id" TEXT NOT NULL,
    "planItemId" TEXT NOT NULL,
    "lifeAreaId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanItemLifeArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LifeArea_userId_sortOrder_idx" ON "LifeArea"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "LifeArea_userId_archivedAt_idx" ON "LifeArea"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "PlanItemLifeArea_lifeAreaId_idx" ON "PlanItemLifeArea"("lifeAreaId");

-- CreateIndex
CREATE INDEX "PlanItemLifeArea_planItemId_isPrimary_idx" ON "PlanItemLifeArea"("planItemId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "PlanItemLifeArea_planItemId_lifeAreaId_key" ON "PlanItemLifeArea"("planItemId", "lifeAreaId");

-- At most one primary Life Area per task
CREATE UNIQUE INDEX "PlanItemLifeArea_one_primary_per_item"
ON "PlanItemLifeArea" ("planItemId")
WHERE "isPrimary" = true;

-- AddForeignKey
ALTER TABLE "LifeArea" ADD CONSTRAINT "LifeArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemLifeArea" ADD CONSTRAINT "PlanItemLifeArea_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemLifeArea" ADD CONSTRAINT "PlanItemLifeArea_lifeAreaId_fkey" FOREIGN KEY ("lifeAreaId") REFERENCES "LifeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
