-- CreateEnum
CREATE TYPE "BodySide" AS ENUM ('FRONT', 'BACK');

-- CreateEnum
CREATE TYPE "BodySymptomType" AS ENUM ('PAIN', 'TENSION', 'NUMBNESS', 'TINGLING', 'BURNING', 'FATIGUE', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "canUseBodyJourneyFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BodyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "bodySide" "BodySide" NOT NULL,
    "markerX" DOUBLE PRECISION NOT NULL,
    "markerY" DOUBLE PRECISION NOT NULL,
    "symptomType" "BodySymptomType" NOT NULL,
    "intensity" INTEGER NOT NULL,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BodyEntry_userId_entryDate_idx" ON "BodyEntry"("userId", "entryDate");

-- CreateIndex
CREATE INDEX "BodyEntry_userId_symptomType_idx" ON "BodyEntry"("userId", "symptomType");

-- AddForeignKey
ALTER TABLE "BodyEntry" ADD CONSTRAINT "BodyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
