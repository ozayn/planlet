import { getJobCategories } from "./job-categories";
import { canonicalCategoryDetails, mergeJobCategories } from "./job-category-types";
import {
  trackerDetailsSchema,
  buildTrackerEvent,
  duplicateReason,
  type TrackerDetails,
  type TrackerEvent,
} from "@/lib/job-tracker-details";
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
import { normalizeJobUrl } from "@/lib/job-url-normalization";
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

  constructor(
    duplicate: { id: string; createdAt: Date },
    reason = "Matching URL",
  ) {
    super(
      `${reason}: a record was saved on ${formatDuplicateJobSavedDate(duplicate.createdAt)}. Review it or save this as a separate role or repost.`,
    );
    this.name = "DuplicateJobApplicationError";
    this.duplicateJobId = duplicate.id;
    this.duplicateSavedAt = duplicate.createdAt;
  }
}

export type SerializedJobApplication = {
  trackerDetails: TrackerDetails;
  trackerHistory: TrackerEvent[];
  submissionConfirmed: boolean;
  submittedDate: string | null;
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
  trackerDetails?: TrackerDetails;
  confirmSubmission?: boolean;
  submissionDate?: string;
  allowDuplicate?: boolean;
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
  trackerDetails: unknown;
  trackerHistory: unknown;
  submissionConfirmed: boolean;
  submittedDate: string | null;
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
    trackerDetails: trackerDetailsSchema.parse(job.trackerDetails ?? {}),
    trackerHistory: job.trackerHistory as TrackerEvent[],
    submissionConfirmed: job.submissionConfirmed,
    submittedDate: job.submittedDate,
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

function trimOptionalField(
  value: string | null | undefined,
  maxLength: number,
) {
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

function sanitizeJobInput(input: JobApplicationInput) {
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
        throw new JobApplicationError(
          "Job URL must start with http:// or https://.",
        );
      }
    } catch (error) {
      if (error instanceof JobApplicationError) {
        throw error;
      }

      throw new JobApplicationError("Enter a valid job URL.");
    }
  }

  const storedUrl = rawUrl;
  const normalizedUrl = storedUrl ? normalizeJobUrl(storedUrl) : null;

  const title = trimOptionalField(input.title, MAX_JOB_TITLE_LENGTH);
  const company = trimOptionalField(input.company, MAX_JOB_COMPANY_LENGTH);

  const appliedDateInput = input.appliedDate;
  const appliedDate =
    appliedDateInput === null ? null : trimOptional(appliedDateInput, 10);
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
    throw new JobApplicationError(
      "Job tracker is not available for this account.",
    );
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

function buildFilterWhere(userId: string, filter: JobApplicationFilter) {
  if (filter === "EVERYTHING") return { userId };
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

  const categories = await getJobCategories(userId);
  return jobs.map(job => {
    const serialized = serializeJobApplication(job);
    return {...serialized, trackerDetails: canonicalCategoryDetails(serialized.trackerDetails, categories)};
  });
}

export async function getJobApplication(
  userId: string,
  jobId: string,
): Promise<SerializedJobApplication | null> {
  await requireJobTrackerUser(userId);

  const job = await prisma.jobApplication.findFirst({
    where: { id: jobId, userId },
  });

  if (!job) return null;
  const serialized = serializeJobApplication(job);
  return {...serialized,trackerDetails:canonicalCategoryDetails(serialized.trackerDetails, await getJobCategories(userId))};
}

export async function createJobApplication(
  userId: string,
  input: JobApplicationInput,
): Promise<SerializedJobApplication> {
  await requireJobTrackerUser(userId);
  const userTimezone = await getUserTimezone(userId);
  validateFlags(input);
  const data = sanitizeJobInput(input);

  const duplicate = await findDuplicateJobApplicationByUrl(
    userId,
    data.normalizedUrl,
  );
  if (duplicate && !input.allowDuplicate) {
    throw new DuplicateJobApplicationError(duplicate);
  }

  const trackerDetails = canonicalCategoryDetails(trackerDetailsSchema.parse(input.trackerDetails ?? {}), await getJobCategories(userId));
  const submissionDate =
    input.submissionDate || getTodayDateString(userTimezone);
  prepareConfirmation(
    data,
    trackerDetails,
    !!input.confirmSubmission,
    submissionDate,
    getTodayDateString(userTimezone),
  );
  await warnPossibleDuplicate(
    userId,
    data,
    trackerDetails,
    input.allowDuplicate,
  );
  const job = await prisma.jobApplication.create({
    data: {
      userId,
      ...data,
      trackerDetails,
      submissionConfirmed: !!input.confirmSubmission,
      submittedDate: input.confirmSubmission ? submissionDate : null,
      trackerHistory: [
        buildTrackerEvent(
          null,
          data.status,
          trackerDetails,
          !!input.confirmSubmission,
          submissionDate,
        ),
      ],
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

  validateFlags(input);
  const timezone = await getUserTimezone(userId);
  const job = await prisma.$transaction(async (tx) => {
    // Serialize edits per record so history and submitted snapshots cannot be lost.
    await tx.$queryRaw`SELECT id FROM "JobApplication" WHERE id = ${jobId} AND "userId" = ${userId} FOR UPDATE`;
    const current = await tx.jobApplication.findFirstOrThrow({
      where: { id: jobId, userId },
    });
    const urlChanged = input.url !== undefined && input.url !== current.url;
    const dateChanged =
      input.appliedDate !== undefined &&
      input.appliedDate !== current.appliedDate;
    const data = sanitizeJobInput({
      ...current,
      ...input,
      trackerDetails: undefined,
      url: urlChanged ? input.url : null,
      appliedDate: dateChanged ? input.appliedDate : null,
    });
    // Partial updates must not rewrite legacy notes, URLs, dates, or other fields.
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      const supplied =
        key === "normalizedUrl"
          ? urlChanged
          : input[key as keyof JobApplicationInput] !== undefined &&
            input[key as keyof JobApplicationInput] !== current[key];
      if (!supplied) Object.assign(data, { [key]: current[key] });
    }
    const categorySetting = await tx.appSetting.findUnique({where:{key:`job-categories:${userId}`}});
    const trackerDetails = canonicalCategoryDetails(trackerDetailsSchema.parse(
      input.trackerDetails ?? current.trackerDetails ?? {},
    ), mergeJobCategories(categorySetting?.value, []));
    const previousDetails = trackerDetailsSchema.parse(
      current.trackerDetails ?? {},
    );
    if (
      data.url !== current.url ||
      data.title !== current.title ||
      data.company !== current.company ||
      trackerDetails.employerJobId !== previousDetails.employerJobId
    ) {
      await warnPossibleDuplicate(
        userId,
        data,
        trackerDetails,
        input.allowDuplicate,
        jobId,
      );
    }
    const confirm = !!input.confirmSubmission && !current.submissionConfirmed;
    const date = input.submissionDate || getTodayDateString(timezone);
    prepareConfirmation(
      data,
      trackerDetails,
      confirm,
      date,
      getTodayDateString(timezone),
    );
    const history = [...(current.trackerHistory as TrackerEvent[])];
    if (!history.length)
      history.push({
        at: current.updatedAt.toISOString(),
        from: null,
        to: current.status,
        kind: "baseline",
      });
    if (confirm || current.status !== data.status)
      history.push(
        buildTrackerEvent(
          current.status,
          data.status,
          trackerDetails,
          confirm,
          date,
        ),
      );
    return tx.jobApplication.update({
      where: { id: jobId },
      data: {
        ...data,
        trackerDetails,
        trackerHistory: history,
        submissionConfirmed: current.submissionConfirmed || confirm,
        submittedDate: current.submittedDate ?? (confirm ? date : null),
      },
    });
  });

  return serializeJobApplication(job);
}

export async function archiveJobApplication(
  userId: string,
  jobId: string,
): Promise<SerializedJobApplication> {
  return updateJobApplication(userId, jobId, {
    status: "ARCHIVED",
    allowDuplicate: true,
  });
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
        normalizedUrl: normalizedUrl || null,
      },
    });
    updated += 1;
  }

  return updated;
}

async function warnPossibleDuplicate(
  userId: string,
  data: { title: string; company: string; url: string | null },
  details: TrackerDetails,
  allow?: boolean,
  excludeId?: string,
) {
  if (allow) return;
  const jobs = await prisma.jobApplication.findMany({
    where: { userId, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  for (const job of jobs) {
    const reason = duplicateReason(
      {
        ...data,
        url: data.url ? normalizeJobUrl(data.url) : null,
        trackerDetails: details,
      },
      {
        ...job,
        url: job.normalizedUrl ?? (job.url ? normalizeJobUrl(job.url) : null),
        trackerDetails: trackerDetailsSchema.parse(job.trackerDetails ?? {}),
      },
    );
    if (reason) throw new DuplicateJobApplicationError(job, reason);
  }
}

function validateFlags(input: JobApplicationInput) {
  if (
    (input.confirmSubmission !== undefined &&
      typeof input.confirmSubmission !== "boolean") ||
    (input.allowDuplicate !== undefined &&
      typeof input.allowDuplicate !== "boolean")
  )
    throw new JobApplicationError("Invalid confirmation.");
}
function prepareConfirmation(
  data: { status: JobApplicationStatus },
  details: TrackerDetails,
  confirm: boolean,
  date: string,
  today: string,
) {
  if (!confirm) return;
  if (!isValidDateString(date) || date > today)
    throw new JobApplicationError(
      "Submission date must be a valid date no later than your local today.",
    );
  if (
    data.status === "SUBMISSION_FAILED" ||
    data.status === "NEEDS_INPUT" ||
    details.blockerType ||
    details.blockerNote
  )
    throw new JobApplicationError(
      "Resolve the blocker or failed attempt before confirming a successful submission.",
    );
  if (["SAVED", "PREPARING", "READY_TO_SUBMIT"].includes(data.status))
    data.status = "APPLIED";
}
