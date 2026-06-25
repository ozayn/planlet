-- Rename entryDate to observedAt. Existing rows keep their observation timestamps.
ALTER TABLE "BodyEntry" RENAME COLUMN "entryDate" TO "observedAt";

ALTER INDEX "BodyEntry_userId_entryDate_idx" RENAME TO "BodyEntry_userId_observedAt_idx";
