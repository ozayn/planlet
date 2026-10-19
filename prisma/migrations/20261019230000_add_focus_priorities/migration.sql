-- CreateTable
CREATE TABLE "FocusPriority" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lifeAreaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "suggestedTaskTitle" TEXT NOT NULL,
    "defaultDurationMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusPriority_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusPriority_userId_sortOrder_idx" ON "FocusPriority"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "FocusPriority_userId_archivedAt_idx" ON "FocusPriority"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "FocusPriority_lifeAreaId_idx" ON "FocusPriority"("lifeAreaId");

-- AddForeignKey
ALTER TABLE "FocusPriority" ADD CONSTRAINT "FocusPriority_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusPriority" ADD CONSTRAINT "FocusPriority_lifeAreaId_fkey" FOREIGN KEY ("lifeAreaId") REFERENCES "LifeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
