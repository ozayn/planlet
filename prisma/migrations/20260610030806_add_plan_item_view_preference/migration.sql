-- CreateEnum
CREATE TYPE "PlanItemView" AS ENUM ('MINIMAL', 'CHECKLIST');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planItemView" "PlanItemView" NOT NULL DEFAULT 'MINIMAL';
