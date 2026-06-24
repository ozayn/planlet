-- CreateEnum
CREATE TYPE "CareerPracticeType" AS ENUM ('LEETCODE', 'ML_REVIEW', 'COURSE', 'SYSTEM_DESIGN', 'PROJECT', 'NETWORKING', 'APPLICATION', 'RECOVERY');

-- CreateEnum
CREATE TYPE "CareerPracticeMode" AS ENUM ('TINY', 'WARMUP', 'MODERATE', 'DEEP');

-- CreateEnum
CREATE TYPE "CareerPracticeStatus" AS ENUM ('PLANNED', 'DONE', 'SKIPPED', 'MOVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canUseCareerJourneyFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CareerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRoles" JSONB NOT NULL,
    "currentFocus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPillar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weeklyTarget" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "pillarId" TEXT,
    "energyBefore" INTEGER,
    "energyAfter" INTEGER,
    "difficulty" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CareerPracticeType" NOT NULL,
    "mode" "CareerPracticeMode" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CareerPracticeStatus" NOT NULL DEFAULT 'PLANNED',
    "date" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareerProfile_userId_key" ON "CareerProfile"("userId");

-- CreateIndex
CREATE INDEX "CareerPillar_userId_sortOrder_idx" ON "CareerPillar"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "CareerCheckIn_userId_date_idx" ON "CareerCheckIn"("userId", "date");

-- CreateIndex
CREATE INDEX "CareerPracticeSession_userId_date_idx" ON "CareerPracticeSession"("userId", "date");

-- CreateIndex
CREATE INDEX "CareerPracticeSession_userId_status_idx" ON "CareerPracticeSession"("userId", "status");

-- AddForeignKey
ALTER TABLE "CareerProfile" ADD CONSTRAINT "CareerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPillar" ADD CONSTRAINT "CareerPillar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerCheckIn" ADD CONSTRAINT "CareerCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerCheckIn" ADD CONSTRAINT "CareerCheckIn_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "CareerPillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPracticeSession" ADD CONSTRAINT "CareerPracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
