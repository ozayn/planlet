-- AlterTable
ALTER TABLE "ActivityTimerPreset" ADD COLUMN "targetDurationSeconds" INTEGER;

-- AlterTable
ALTER TABLE "ActivityTimerSession" ADD COLUMN "targetDurationSeconds" INTEGER;
