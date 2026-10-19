-- AlterTable
ALTER TABLE "User" ADD COLUMN "canUsePomodoroFeatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PomodoroPreference" (
    "userId" TEXT NOT NULL,
    "focusDurationSeconds" INTEGER NOT NULL DEFAULT 1500,
    "shortBreakSeconds" INTEGER NOT NULL DEFAULT 300,
    "longBreakSeconds" INTEGER NOT NULL DEFAULT 900,
    "sessionsBeforeLongBreak" INTEGER NOT NULL DEFAULT 4,
    "autoStartBreaks" BOOLEAN NOT NULL DEFAULT false,
    "autoStartFocus" BOOLEAN NOT NULL DEFAULT false,
    "completionSound" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PomodoroPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PomodoroActiveRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "focusIndex" INTEGER NOT NULL DEFAULT 1,
    "completedFocusCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "accumulatedPausedSeconds" INTEGER NOT NULL DEFAULT 0,
    "targetDurationSeconds" INTEGER NOT NULL,
    "taskId" TEXT,
    "customTitle" TEXT,
    "transitionToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PomodoroActiveRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PomodoroFocusLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT,
    "taskId" TEXT,
    "customTitle" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'focus',
    "plannedDurationSeconds" INTEGER NOT NULL,
    "actualFocusedSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "interrupted" BOOLEAN NOT NULL DEFAULT false,
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PomodoroFocusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PomodoroActiveRun_userId_key" ON "PomodoroActiveRun"("userId");

-- CreateIndex
CREATE INDEX "PomodoroActiveRun_userId_status_idx" ON "PomodoroActiveRun"("userId", "status");

-- CreateIndex
CREATE INDEX "PomodoroFocusLog_userId_startedAt_idx" ON "PomodoroFocusLog"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "PomodoroFocusLog_userId_endedAt_idx" ON "PomodoroFocusLog"("userId", "endedAt");

-- AddForeignKey
ALTER TABLE "PomodoroPreference" ADD CONSTRAINT "PomodoroPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroActiveRun" ADD CONSTRAINT "PomodoroActiveRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroFocusLog" ADD CONSTRAINT "PomodoroFocusLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
