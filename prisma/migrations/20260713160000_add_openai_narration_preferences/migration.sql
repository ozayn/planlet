-- CreateEnum
CREATE TYPE "OpenAiNarrationStyle" AS ENUM (
  'BRITISH_FEMALE_CALM',
  'NEUTRAL_EDUCATIONAL',
  'WARM_CONVERSATIONAL',
  'CUSTOM'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "lifeLabOpenAiTtsVoice" TEXT,
ADD COLUMN "lifeLabOpenAiNarrationStyle" "OpenAiNarrationStyle" NOT NULL DEFAULT 'BRITISH_FEMALE_CALM',
ADD COLUMN "lifeLabCustomNarrationInstructions" TEXT;
