import type { JobApplicationStatus } from "@/app/generated/prisma/client";

import {
  defaultJobCompany,
  defaultJobTitle,
  formatDuplicateJobSavedDate,
} from "@/lib/job-application-defaults";
import {
  isJobApplicationStatus,
  type JobApplicationStatusValue,
} from "@/lib/job-application-status";
import {
  MAX_JOB_COMPANY_LENGTH,
  MAX_JOB_DESCRIPTION_LENGTH,
  MAX_JOB_LOCATION_LENGTH,
  MAX_JOB_NOTES_LENGTH,
  MAX_JOB_REFERRER_LENGTH,
  MAX_JOB_SALARY_LENGTH,
  MAX_JOB_SOURCE_LENGTH,
  MAX_JOB_SUMMARY_LENGTH,
  MAX_JOB_TITLE_LENGTH,
  MAX_JOB_URL_LENGTH,
  type JobApplicationFilter,
} from "@/lib/job-application-constants";
import { isValidDateString, getTodayDateString } from "@/lib/dates";
import {
  normalizeJobUrl,
  normalizeJobUrlForStorage,
} from "@/lib/job-url-normalization";
import { canUseJobTrackerFeatures } from "@/lib/roles";
import { getUserTimezone } from "@/lib/user-timezone";
import { prisma } from "@/lib/prisma";

export class JobApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobApplicationError";
  }
}

export class DuplicateJobApplicationError extends JobApplicationError {
  readonly duplicateJobId: string;
  readonly duplicateSavedAt: Date;

  constructor(duplicate: { id: string; createdAt: Date }) {
    super(`You already saved this job on ${formatDuplicateJobSavedDate(duplicate.createdAt)}.`);
    this.name = "DuplicateJobApplicationError";
    this.duplicateJobId = duplicate.id;
    this.duplicateSavedAt = duplicate.createdAt;
  }
}

export type SerializedJobApplication = {
  id: string;
  title: string;
  company: string;
  url: string | null;
  description: string | null;
  summary: string | null;
  source: string | null;
  referrer: string | null;
  location: string | null;
  salary: string | null;
  appliedDate: string | null;
  status: JobApplicationStatusValue;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobApplicationInput = {
  title?: string;
  company?: string;
  url?: string | null;
  description?: string | null;
  summary?: string | null;
  source?: string | null;
  referrer?: string | null;
  location?: string | null;
  salary?: string | null;
  appliedDate?: string | null;
  status?: JobApplicationStatusValue;
  notes?: string | null;
};

function serializeJobApplication(job: {
  id: string;
  title: string;
  company: string;
  url: string | null;
  description: string | null;
  summary: string | null;
  source: string | null;
  referrer: string | null;
  location: string | null;
  salary: string | null;
  appliedDate: string | null;
  status: JobApplicationStatusValue;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedJobApplication {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    url: job.url,
    description: job.description,
    summary: job.summary,
    source: job.source,
    referrer: job.referrer,
    location: job.location,
    salary: job.salary,
    appliedDate: job.appliedDate,
    status: job.status,
    notes: job.notes,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function trimOptional(value: string | null | undefined, maxLength: number) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function trimOptionalField(value: string | null | undefined, maxLength: number) {
  if (value == null) {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function hasMinimumJobContent(input: JobApplicationInput): boolean {
  return Boolean(
    input.title?.trim() || input.url?.trim() || input.description?.trim(),
  );
}

function sanitizeJobInput(
  input: JobApplicationInput,
  options?: { defaultAppliedDate?: string },
) {
  if (!hasMinimumJobContent(input)) {
    throw new JobApplicationError(
      "Add at least a job URL, title, or description before saving.",
    );
  }

  const rawUrl = trimOptional(input.url, MAX_JOB_URL_LENGTH);
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new JobApplicationError("Job URL must start with http:// or https://.");
      }
    } catch (error) {
      if (error instanceof JobApplicationError) {
        throw error;
      }

      throw new JobApplicationError("Enter a valid job URL.");
    }
  }

  const storedUrl = rawUrl ? normalizeJobUrlForStorage(rawUrl) : null;
  const normalizedUrl = storedUrl ? normalizeJobUrl(storedUrl) : null;

  const title = trimOptionalField(input.title, MAX_JOB_TITLE_LENGTH);
  const company = trimOptionalField(input.company, MAX_JOB_COMPANY_LENGTH);

  const appliedDateInput = input.appliedDate;
  let appliedDate =
    appliedDateInput === null ? null : trimOptional(appliedDateInput, 10);
  if (!appliedDate && appliedDateInput !== null && options?.defaultAppliedDate) {
    appliedDate = options.defaultAppliedDate;
  }
  if (appliedDate && !isValidDateString(appliedDate)) {
    throw new JobApplicationError("Applied date must be YYYY-MM-DD.");
  }

  const status = input.status ?? "SAVED";
  if (!isJobApplicationStatus(status)) {
    throw new JobApplicationError("Invalid status.");
  }

  return {
    title: title || defaultJobTitle(),
    company: company || defaultJobCompany(),
    url: storedUrl,
    normalizedUrl,
    description: trimOptional(input.description, MAX_JOB_DESCRIPTION_LENGTH),
    summary: trimOptional(input.summary, MAX_JOB_SUMMARY_LENGTH),
    source: trimOptional(input.source, MAX_JOB_SOURCE_LENGTH),
    referrer: trimOptional(input.referrer, MAX_JOB_REFERRER_LENGTH),
    location: trimOptional(input.location, MAX_JOB_LOCATION_LENGTH),
    salary: trimOptional(input.salary, MAX_JOB_SALARY_LENGTH),
    appliedDate,
    status: status as JobApplicationStatus,
    notes: trimOptional(input.notes, MAX_JOB_NOTES_LENGTH),
  };
}

async function requireJobTrackerUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      canUseJobTrackerFeatures: true,
      role: true,
    },
  });

  if (!user || !canUseJobTrackerFeatures(user)) {
    throw new JobApplicationError("Job tracker is not available for this account.");
  }

  return user;
}

async function findDuplicateJobApplicationByUrl(
  userId: string,
  normalizedUrl: string | null,
  excludeId?: string,
) {
  if (!normalizedUrl) {
    return null;
  }

  return prisma.jobApplication.findFirst({
    where: {
      userId,
      normalizedUrl,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      createdAt: true,
    },
  });
}

function buildFilterWhere(
  userId: string,
  filter: JobApplicationFilter,
) {
  if (filter === "ALL") {
    return {
      userId,
      status: { not: "ARCHIVED" as const },
    };
  }

  return {
    userId,
    status: filter,
  };
}

export async function listJobApplications(
  userId: string,
  filter: JobApplicationFilter = "ALL",
): Promise<SerializedJobApplication[]> {
  await requireJobTrackerUser(userId);

  const jobs = await prisma.jobApplication.findMany({
    where: buildFilterWhere(userId, filter),
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return jobs.map(serializeJobApplication);
}

export async function getJobApplication(
  userId: string,
  jobId: string,
): Promise<SerializedJobApplication | null> {
  await requireJobTrackerUser(userId);

  const job = await prisma.jobApplication.findFirst({
    where: { id: jobId, userId },
  });

  return job ? serializeJobApplication(job) : null;
}

export async function createJobApplication(
  userId: string,
  input: JobApplicationInput,
): Promise<SerializedJobApplication> {
  await requireJobTrackerUser(userId);
  const userTimezone = await getUserTimezone(userId);
  const data = sanitizeJobInput(input, {
    defaultAppliedDate: getTodayDateString(userTimezone),
  });

  const duplicate = await findDuplicateJobApplicationByUrl(
    userId,
    data.normalizedUrl,
  );
  if (duplicate) {
    throw new DuplicateJobApplicationError(duplicate);
  }

  const job = await prisma.jobApplication.create({
    data: {
      userId,
      ...data,
    },
  });

  return serializeJobApplication(job);
}

export async function updateJobApplication(
  userId: string,
  jobId: string,
  input: JobApplicationInput,
): Promise<SerializedJobApplication> {
  await requireJobTrackerUser(userId);
  const existing = await prisma.jobApplication.findFirst({
    where: { id: jobId, userId },
  });

  if (!existing) {
    throw new JobApplicationError("Job application not found.");
  }

  const data = sanitizeJobInput(input);
  const duplicate = await findDuplicateJobApplicationByUrl(
    userId,
    data.normalizedUrl,
    jobId,
  );
  if (duplicate) {
    throw new DuplicateJobApplicationError(duplicate);
  }

  const job = await prisma.jobApplication.update({
    where: { id: jobId },
    data,
  });

  return serializeJobApplication(job);
}

export async function archiveJobApplication(
  userId: string,
  jobId: string,
): Promise<SerializedJobApplication> {
  await requireJobTrackerUser(userId);

  const existing = await prisma.jobApplication.findFirst({
    where: { id: jobId, userId },
  });

  if (!existing) {
    throw new JobApplicationError("Job application not found.");
  }

  const job = await prisma.jobApplication.update({
    where: { id: jobId },
    data: { status: "ARCHIVED" },
  });

  return serializeJobApplication(job);
}

export async function deleteJobApplication(
  userId: string,
  jobId: string,
): Promise<void> {
  await requireJobTrackerUser(userId);

  const existing = await prisma.jobApplication.findFirst({
    where: { id: jobId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new JobApplicationError("Job application not found.");
  }

  await prisma.jobApplication.delete({
    where: { id: jobId },
  });
}

export async function backfillJobApplicationNormalizedUrls(): Promise<number> {
  const jobs = await prisma.jobApplication.findMany({
    where: {
      url: { not: null },
      OR: [{ normalizedUrl: null }, { normalizedUrl: "" }],
    },
    select: {
      id: true,
      url: true,
    },
  });

  let updated = 0;

  for (const job of jobs) {
    if (!job.url) {
      continue;
    }

    const normalizedUrl = normalizeJobUrl(job.url);
    await prisma.jobApplication.update({
      where: { id: job.id },
      data: {
        url: normalizeJobUrlForStorage(job.url),
        normalizedUrl: normalizedUrl || null,
      },
    });
    updated += 1;
  }

  return updated;
}
