-- Rename tags to themes; existing tag values are preserved as theme strings.
ALTER TABLE "LearningEntry" RENAME COLUMN "tags" TO "themes";
