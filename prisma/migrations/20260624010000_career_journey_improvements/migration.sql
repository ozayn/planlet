-- AlterEnum
ALTER TYPE "CareerPracticeType" ADD VALUE 'INTERVIEW_PREP';

-- CreateTable
CREATE TABLE "CareerWeeklyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "gaveEnergy" TEXT,
    "drainedEnergy" TEXT,
    "roleFeltAlive" TEXT,
    "nextStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerWeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerWeeklyReview_userId_weekStart_idx" ON "CareerWeeklyReview"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "CareerWeeklyReview_userId_weekStart_key" ON "CareerWeeklyReview"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "CareerWeeklyReview" ADD CONSTRAINT "CareerWeeklyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
