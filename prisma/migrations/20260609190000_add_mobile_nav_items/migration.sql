-- AlterTable
ALTER TABLE "User" ADD COLUMN "mobileNavItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
