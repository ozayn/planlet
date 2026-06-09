-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "PlanLanguage" AS ENUM ('FA', 'EN', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlanItemType" AS ENUM ('TASK', 'EVENT', 'INTENTION', 'NOTE', 'WORK_BLOCK', 'ERRAND', 'SOCIAL', 'REST');

-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('OPEN', 'DONE', 'PARTIAL', 'MOVED', 'SKIPPED', 'RELEASED');

-- CreateEnum
CREATE TYPE "SatisfactionLevel" AS ENUM ('LOW', 'OKAY', 'SATISFIED', 'PROUD');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CERTAIN');

-- CreateEnum
CREATE TYPE "ExcitementLevel" AS ENUM ('AVOIDING', 'NEUTRAL', 'INTERESTED', 'EXCITED');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TimeHint" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME', 'ALL_DAY', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "ShareExportFormat" AS ENUM ('PLAIN_TEXT', 'TELEGRAM', 'SUMMARY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "title" TEXT NOT NULL,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "rawInput" TEXT,
    "summary" TEXT,
    "language" "PlanLanguage" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "parentItemId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PlanItemType" NOT NULL DEFAULT 'TASK',
    "status" "PlanItemStatus" NOT NULL DEFAULT 'OPEN',
    "progressLevel" INTEGER NOT NULL DEFAULT 0,
    "satisfactionLevel" "SatisfactionLevel",
    "confidenceLevel" "ConfidenceLevel",
    "excitementLevel" "ExcitementLevel",
    "importance" "PriorityLevel",
    "urgency" "PriorityLevel",
    "timeHint" "TimeHint",
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "comment" TEXT,
    "shareable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItemTheme" (
    "id" TEXT NOT NULL,
    "planItemId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanItemTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareExport" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "format" "ShareExportFormat" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Plan_userId_type_dateStart_idx" ON "Plan"("userId", "type", "dateStart");

-- CreateIndex
CREATE INDEX "PlanItem_planId_sortOrder_idx" ON "PlanItem"("planId", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanItem_parentItemId_idx" ON "PlanItem"("parentItemId");

-- CreateIndex
CREATE INDEX "Theme_userId_name_idx" ON "Theme"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PlanItemTheme_planItemId_themeId_key" ON "PlanItemTheme"("planItemId", "themeId");

-- CreateIndex
CREATE INDEX "ShareExport_planId_createdAt_idx" ON "ShareExport"("planId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "PlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemTheme" ADD CONSTRAINT "PlanItemTheme_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemTheme" ADD CONSTRAINT "PlanItemTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareExport" ADD CONSTRAINT "ShareExport_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
