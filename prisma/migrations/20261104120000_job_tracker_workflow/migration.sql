-- Additive only: legacy statuses, dates, URLs and notes remain untouched.
ALTER TYPE "JobApplicationStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "JobApplicationStatus" ADD VALUE IF NOT EXISTS 'NEEDS_INPUT';
ALTER TYPE "JobApplicationStatus" ADD VALUE IF NOT EXISTS 'READY_TO_SUBMIT';
ALTER TYPE "JobApplicationStatus" ADD VALUE IF NOT EXISTS 'SUBMISSION_FAILED';
ALTER TABLE "JobApplication"
 ADD COLUMN "trackerDetails" JSONB NOT NULL DEFAULT '{}',
 ADD COLUMN "trackerHistory" JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN "submissionConfirmed" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "submittedDate" TEXT;
