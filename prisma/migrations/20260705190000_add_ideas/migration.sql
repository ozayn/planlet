-- CreateEnum
CREATE TYPE "IdeaCategory" AS ENUM ('PRODUCT', 'BUSINESS', 'CAREER', 'PHOTOGRAPHY', 'LEARNING', 'TRAVEL', 'WRITING', 'PERSONAL', 'CREATIVE', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('NEW', 'THINKING', 'EXPLORING', 'BUILDING', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "IdeaCategory",
    "status" "IdeaStatus" NOT NULL DEFAULT 'NEW',
    "tags" TEXT[],
    "notes" TEXT,
    "ideaDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Idea_userId_ideaDate_idx" ON "Idea"("userId", "ideaDate");

-- CreateIndex
CREATE INDEX "Idea_userId_status_idx" ON "Idea"("userId", "status");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
