-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PLAN_ITEM_COMMENT';

-- CreateTable
CREATE TABLE "PlanItemComment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanItemComment_itemId_createdAt_idx" ON "PlanItemComment"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanItemComment_authorId_createdAt_idx" ON "PlanItemComment"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlanItemComment" ADD CONSTRAINT "PlanItemComment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemComment" ADD CONSTRAINT "PlanItemComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
