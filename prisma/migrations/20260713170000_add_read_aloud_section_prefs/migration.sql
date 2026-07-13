-- AlterTable
ALTER TABLE "User"
ADD COLUMN "lifeLabReadAloudAutoContinue" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lifeLabReadAloudSectionInclusion" JSONB;
