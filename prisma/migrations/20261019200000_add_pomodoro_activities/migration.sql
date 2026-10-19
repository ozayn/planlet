-- CreateTable
CREATE TABLE "PomodoroActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PomodoroActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PomodoroActivity_userId_sortOrder_idx" ON "PomodoroActivity"("userId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PomodoroActivity" ADD CONSTRAINT "PomodoroActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
