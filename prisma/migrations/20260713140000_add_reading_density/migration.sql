-- CreateEnum
CREATE TYPE "ReadingDensity" AS ENUM ('COMPACT', 'COMFORTABLE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "readingDensity" "ReadingDensity" NOT NULL DEFAULT 'COMPACT';
