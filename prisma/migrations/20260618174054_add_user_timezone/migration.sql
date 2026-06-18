-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timezone" TEXT;

-- Backfill existing users for compatibility with prior app-wide Eastern Time behavior.
UPDATE "User" SET "timezone" = 'America/New_York' WHERE "timezone" IS NULL;
