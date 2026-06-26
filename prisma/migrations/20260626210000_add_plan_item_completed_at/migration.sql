-- AlterTable
ALTER TABLE "PlanItem" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill existing completed items so display order stays stable.
UPDATE "PlanItem" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE';
