-- CreateEnum
CREATE TYPE "CoachingOpenAiNarrationStyle" AS ENUM ('KIND_BRITISH_MENTOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "coachingOpenAiTtsVoice" TEXT,
ADD COLUMN "coachingOpenAiNarrationStyle" "CoachingOpenAiNarrationStyle" NOT NULL DEFAULT 'KIND_BRITISH_MENTOR';
