-- AlterEnum
ALTER TYPE "BodySymptomType" ADD VALUE 'SKIN_SPOT';
ALTER TYPE "BodySymptomType" ADD VALUE 'RASH';
ALTER TYPE "BodySymptomType" ADD VALUE 'ITCHING';
ALTER TYPE "BodySymptomType" ADD VALUE 'BRUISE';
ALTER TYPE "BodySymptomType" ADD VALUE 'SWELLING';
ALTER TYPE "BodySymptomType" ADD VALUE 'CUT_WOUND';
ALTER TYPE "BodySymptomType" ADD VALUE 'COLOR_CHANGE';
ALTER TYPE "BodySymptomType" ADD VALUE 'TEXTURE_CHANGE';

-- CreateEnum
CREATE TYPE "BodySkinChangeStatus" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- AlterTable
ALTER TABLE "BodyEntry"
ADD COLUMN "skinSize" TEXT,
ADD COLUMN "skinShape" TEXT,
ADD COLUMN "skinColor" TEXT,
ADD COLUMN "skinChanged" "BodySkinChangeStatus";
