-- AlterTable
ALTER TABLE "ActivityTimerPreset" ADD COLUMN "timerMode" TEXT NOT NULL DEFAULT 'countUp';

-- AlterTable
ALTER TABLE "ActivityTimerSession" ADD COLUMN "timerMode" TEXT NOT NULL DEFAULT 'countUp';
ALTER TABLE "ActivityTimerSession" ADD COLUMN "pausedAt" TIMESTAMP(3);
ALTER TABLE "ActivityTimerSession" ADD COLUMN "accumulatedPausedSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ActivityTimerSession" ADD COLUMN "completed" BOOLEAN NOT NULL DEFAULT false;
