import type { JobApplicationStatus } from "@/app/generated/prisma/client";

import {
  JOB_APPLICATION_STATUSES,
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
import { isValidDateString } from "@/lib/dates";
import { canUseJobTrackerFeatures } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export class JobApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobApplicationError";
  }
}

export class DuplicateJobApplicationError extends JobApplicationError {
  constructor(message = "You already saved this job.") {
    super(message);
    this.name = "DuplicateJobApplicationError";
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
  status: JobApplicationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobApplicationInput = {
  title: string;
  company: string;
  url?: string | null;
  description?: string | null;
  summary?: string | null;
  source?: string | null;
  referrer?: string | null;
  location?: string | null;
  salary?: string | null;
  appliedDate?: string | null;
  status?: JobApplicationStatus;
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
  status: JobApplicationStatus;
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

function trimRequired(value: string, maxLength: number, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new JobApplicationError(`${label} is required.`);
  }

  return trimmed.slice(0, maxLength);
}

function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return url.trim().toLowerCase();
    }

    parsed.hash = "";
    let normalized = `${parsed.origin}${parsed.pathname}`;
    if (normalized.endsWith("/") && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }

    return normalized.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeComparableTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function isSimilarJobTitle(a: string, b: string): boolean {
  const left = normalizeComparableTitle(a);
  const right = normalizeComparableTitle(b);

  if (left === right) {
    return true;
  }

  if (left.length >= 8 && right.length >= 8) {
    return left.includes(right) || right.includes(left);
  }

  return false;
}

function sanitizeJobInput(input: JobApplicationInput) {
  const title = trimRequired(input.title, MAX_JOB_TITLE_LENGTH, "Title");
  const company = trimRequired(input.company, MAX_JOB_COMPANY_LENGTH, "Company");
  const url = trimOptional(input.url, MAX_JOB_URL_LENGTH);

  if (url) {
    try {
      const parsed = new URL(url);
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

  const appliedDate = trimOptional(input.appliedDate, 10);
  if (appliedDate && !isValidDateString(appliedDate)) {
    throw new JobApplicationError("Applied date must be YYYY-MM-DD.");
  }

  const status = input.status ?? "SAVED";
  if (!JOB_APPLICATION_STATUSES.includes(status)) {
    throw new JobApplicationError("Invalid status.");
  }

  return {
    title,
    company,
    url,
    description: trimOptional(input.description, MAX_JOB_DESCRIPTION_LENGTH),
    summary: trimOptional(input.summary, MAX_JOB_SUMMARY_LENGTH),
    source: trimOptional(input.source, MAX_JOB_SOURCE_LENGTH),
    referrer: trimOptional(input.referrer, MAX_JOB_REFERRER_LENGTH),
    location: trimOptional(input.location, MAX_JOB_LOCATION_LENGTH),
    salary: trimOptional(input.salary, MAX_JOB_SALARY_LENGTH),
    appliedDate,
    status,
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

async function findDuplicateJobApplication(
  userId: string,
  input: { url: string | null; company: string; title: string },
  excludeId?: string,
) {
  const jobs = await prisma.jobApplication.findMany({
    where: {
      userId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      url: true,
      company: true,
      title: true,
    },
  });

  if (input.url) {
    const normalizedUrl = normalizeJobUrl(input.url);
    const duplicate = jobs.find(
      (job) => job.url && normalizeJobUrl(job.url) === normalizedUrl,
    );

    if (duplicate) {
      return duplicate;
    }
  }

  const companyKey = input.company.trim().toLowerCase();
  return (
    jobs.find(
      (job) =>
        job.company.trim().toLowerCase() === companyKey &&
        isSimilarJobTitle(job.title, input.title),
    ) ?? null
  );
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
  const data = sanitizeJobInput(input);

  const duplicate = await findDuplicateJobApplication(userId, data);
  if (duplicate) {
    throw new DuplicateJobApplicationError();
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
  const duplicate = await findDuplicateJobApplication(userId, data, jobId);
  if (duplicate) {
    throw new DuplicateJobApplicationError();
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
