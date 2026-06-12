-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('MORNING_PLAN', 'EVENING_REFLECTION');

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "morningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "morningTime" TEXT NOT NULL DEFAULT '09:00',
    "eveningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "eveningTime" TEXT NOT NULL DEFAULT '21:00',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "localDate" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "SentReminder_userId_localDate_idx" ON "SentReminder"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "SentReminder_userId_type_localDate_key" ON "SentReminder"("userId", "type", "localDate");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentReminder" ADD CONSTRAINT "SentReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
