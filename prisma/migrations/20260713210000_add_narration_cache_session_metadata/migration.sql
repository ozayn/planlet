-- Add inspectable OpenAI narration cache metadata for session compatibility checks.
ALTER TABLE "LifeLabNarrationCache" ADD COLUMN "narrationStyle" TEXT;
ALTER TABLE "LifeLabNarrationCache" ADD COLUMN "instructionsFingerprint" TEXT;
ALTER TABLE "LifeLabNarrationCache" ADD COLUMN "contentProfile" TEXT;
ALTER TABLE "LifeLabNarrationCache" ADD COLUMN "readAloudSectionId" TEXT;

CREATE INDEX "LifeLabNarrationCache_driveFileId_voice_narrationStyle_idx"
ON "LifeLabNarrationCache"("driveFileId", "voice", "narrationStyle");

ALTER TABLE "CoachingNarrationCache" ADD COLUMN "instructionsFingerprint" TEXT;
