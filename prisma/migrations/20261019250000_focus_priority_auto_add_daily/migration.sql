-- AlterTable
ALTER TABLE "FocusPriority" ADD COLUMN "autoAddToDailyPlan" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "FocusPriority_userId_autoAddToDailyPlan_idx" ON "FocusPriority"("userId", "autoAddToDailyPlan");

-- CreateTable
CREATE TABLE "FocusPriorityDailyPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focusPriorityId" TEXT NOT NULL,
    "dayDate" TEXT NOT NULL,
    "planItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusPriorityDailyPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusPriorityDailyPlacement_userId_dayDate_idx" ON "FocusPriorityDailyPlacement"("userId", "dayDate");

-- CreateIndex
CREATE INDEX "FocusPriorityDailyPlacement_focusPriorityId_dayDate_idx" ON "FocusPriorityDailyPlacement"("focusPriorityId", "dayDate");

-- CreateIndex
CREATE UNIQUE INDEX "FocusPriorityDailyPlacement_userId_focusPriorityId_dayDate_key" ON "FocusPriorityDailyPlacement"("userId", "focusPriorityId", "dayDate");

-- AddForeignKey
ALTER TABLE "FocusPriorityDailyPlacement" ADD CONSTRAINT "FocusPriorityDailyPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusPriorityDailyPlacement" ADD CONSTRAINT "FocusPriorityDailyPlacement_focusPriorityId_fkey" FOREIGN KEY ("focusPriorityId") REFERENCES "FocusPriority"("id") ON DELETE CASCADE ON UPDATE CASCADE;
