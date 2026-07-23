-- CreateTable
CREATE TABLE "LifeLabItemState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "studyStatus" TEXT,
    "lastPosition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeLabItemState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LifeLabItemState_userId_archivedAt_idx" ON "LifeLabItemState"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "LifeLabItemState_userId_section_idx" ON "LifeLabItemState"("userId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "LifeLabItemState_userId_itemKey_key" ON "LifeLabItemState"("userId", "itemKey");

-- AddForeignKey
ALTER TABLE "LifeLabItemState" ADD CONSTRAINT "LifeLabItemState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
