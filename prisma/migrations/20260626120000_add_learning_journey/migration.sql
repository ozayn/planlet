-- CreateEnum
CREATE TYPE "LearningSourceType" AS ENUM ('MUSEUM', 'BOOK', 'ARTICLE', 'PODCAST', 'YOUTUBE', 'COURSE', 'FRIEND', 'CONVERSATION', 'THERAPY', 'IMPROV', 'WORK', 'PROJECT', 'TRAVEL', 'LIFE', 'OTHER');

-- CreateEnum
CREATE TYPE "LearningCategory" AS ENUM ('ART', 'HISTORY', 'PHILOSOPHY', 'PSYCHOLOGY', 'MACHINE_LEARNING', 'DATA_ENGINEERING', 'CAREER', 'RELATIONSHIPS', 'BODY', 'CREATIVITY', 'IMPROV', 'MEDITATION', 'POLITICS', 'CULTURE', 'SCIENCE', 'TECHNOLOGY', 'LANGUAGE', 'SELF_UNDERSTANDING', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "canUseLearningJourneyFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LearningEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceType" "LearningSourceType",
    "sourceName" TEXT,
    "category" "LearningCategory",
    "learnedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningEntry_userId_learnedAt_idx" ON "LearningEntry"("userId", "learnedAt");

-- AddForeignKey
ALTER TABLE "LearningEntry" ADD CONSTRAINT "LearningEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
