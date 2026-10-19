-- AlterTable
ALTER TABLE "FocusPriority" ADD COLUMN "description" TEXT;
ALTER TABLE "FocusPriority" ADD COLUMN "subtopics" TEXT[] DEFAULT ARRAY[]::TEXT[];
