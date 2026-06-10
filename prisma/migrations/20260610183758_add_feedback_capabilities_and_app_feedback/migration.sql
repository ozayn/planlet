-- CreateEnum
CREATE TYPE "FeedbackArea" AS ENUM ('MOBILE', 'UI', 'TASKS', 'PLANS', 'INSIGHTS', 'SHARING', 'NOTIFICATIONS', 'SETTINGS', 'ADMIN', 'AI_IMPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'REVIEWED', 'PLANNED', 'DONE', 'WONT_DO');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'APP_FEEDBACK';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canGiveFeedback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canUseReflectionFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppFeedback" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "area" "FeedbackArea" NOT NULL,
    "pagePath" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "AppFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppFeedback_authorId_createdAt_idx" ON "AppFeedback"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "AppFeedback_status_createdAt_idx" ON "AppFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AppFeedback_area_createdAt_idx" ON "AppFeedback"("area", "createdAt");

-- AddForeignKey
ALTER TABLE "AppFeedback" ADD CONSTRAINT "AppFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppFeedback" ADD CONSTRAINT "AppFeedback_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
