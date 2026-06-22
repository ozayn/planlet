-- CreateEnum
CREATE TYPE "TaskOrganizationDisplay" AS ENUM ('MINIMAL', 'ASSIGNED_ONLY', 'ALWAYS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "taskOrganizationDisplay" "TaskOrganizationDisplay" NOT NULL DEFAULT 'ASSIGNED_ONLY';
