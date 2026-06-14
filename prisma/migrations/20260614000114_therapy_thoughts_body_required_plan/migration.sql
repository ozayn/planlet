/*
  Warnings:

  - You are about to drop the column `content` on the `TherapyThought` table. All the data in the column will be lost.
  - Added the required column `body` to the `TherapyThought` table without a default value. This is not possible if the table is not empty.
  - Made the column `planId` on table `TherapyThought` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "TherapyThought" DROP CONSTRAINT "TherapyThought_planId_fkey";

-- AlterTable
ALTER TABLE "TherapyThought" DROP COLUMN "content",
ADD COLUMN     "body" TEXT NOT NULL,
ALTER COLUMN "planId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "TherapyThought" ADD CONSTRAINT "TherapyThought_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
