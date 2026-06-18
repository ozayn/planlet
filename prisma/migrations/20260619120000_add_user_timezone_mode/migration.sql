-- CreateEnum
CREATE TYPE "TimezoneMode" AS ENUM ('AUTOMATIC', 'MANUAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "timezoneMode" "TimezoneMode" NOT NULL DEFAULT 'AUTOMATIC';

-- Preserve prior Eastern Time behavior for users who already have a stored timezone.
UPDATE "User" SET "timezoneMode" = 'MANUAL' WHERE "timezone" IS NOT NULL;
