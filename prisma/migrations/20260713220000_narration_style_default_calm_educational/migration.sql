-- New users default to Calm educational (NEUTRAL_EDUCATIONAL).
-- Existing BRITISH_FEMALE_CALM rows keep that enum value (now labeled British-leaning).
ALTER TABLE "User" ALTER COLUMN "lifeLabOpenAiNarrationStyle" SET DEFAULT 'NEUTRAL_EDUCATIONAL';
