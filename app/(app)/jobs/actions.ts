"use server";

import { revalidatePath } from "next/cache";

import { extractJobFromUrl } from "@/lib/ai/extract-job-from-url";
import type { ExtractedJobDetails } from "@/lib/ai/extract-job-from-url";
import type { JobApplicationFilter } from "@/lib/job-application-constants";
import {
  DuplicateJobApplicationError,
  archiveJobApplication,
  createJobApplication,
  deleteJobApplication,
  listJobApplications,
  updateJobApplication,
  type JobApplicationInput,
  type SerializedJobApplication,
} from "@/lib/job-applications";
import { canUseJobTrackerFeatures } from "@/lib/roles";
import { auth } from "@/auth";

export type JobTrackerActionResult =
  | { success: true }
  | { success: false; error: string; duplicate?: boolean };

export type JobTrackerCreateResult =
  | { success: true; job: SerializedJobApplication }
  | { success: false; error: string; duplicate?: boolean };

export type JobTrackerExtractResult =
  | { success: true; details: ExtractedJobDetails }
  | { success: false; error: string };

async function requireJobTrackerSession() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseJobTrackerFeatures(session.user)) {
    throw new Error("Job tracker is not available for this account.");
  }

  return userId;
}

function revalidateJobTracker() {
  revalidatePath("/jobs");
}

function mapJobError(error: unknown): JobTrackerActionResult {
  if (error instanceof DuplicateJobApplicationError) {
    return {
      success: false,
      error: error.message,
      duplicate: true,
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : "Something went wrong.",
  };
}

export async function listJobApplicationsAction(
  filter: JobApplicationFilter = "ALL",
): Promise<SerializedJobApplication[]> {
  const userId = await requireJobTrackerSession();
  return listJobApplications(userId, filter);
}

export async function createJobApplicationAction(
  input: JobApplicationInput,
): Promise<JobTrackerCreateResult> {
  try {
    const userId = await requireJobTrackerSession();
    const job = await createJobApplication(userId, input);
    revalidateJobTracker();
    return { success: true, job };
  } catch (error) {
    return mapJobError(error) as JobTrackerCreateResult;
  }
}

export async function updateJobApplicationAction(input: {
  jobId: string;
  data: JobApplicationInput;
}): Promise<JobTrackerCreateResult> {
  try {
    const userId = await requireJobTrackerSession();
    const job = await updateJobApplication(userId, input.jobId, input.data);
    revalidateJobTracker();
    return { success: true, job };
  } catch (error) {
    return mapJobError(error) as JobTrackerCreateResult;
  }
}

export async function archiveJobApplicationAction(
  jobId: string,
): Promise<JobTrackerCreateResult> {
  try {
    const userId = await requireJobTrackerSession();
    const job = await archiveJobApplication(userId, jobId);
    revalidateJobTracker();
    return { success: true, job };
  } catch (error) {
    return mapJobError(error) as JobTrackerCreateResult;
  }
}

export async function deleteJobApplicationAction(
  jobId: string,
): Promise<JobTrackerActionResult> {
  try {
    const userId = await requireJobTrackerSession();
    await deleteJobApplication(userId, jobId);
    revalidateJobTracker();
    return { success: true };
  } catch (error) {
    return mapJobError(error);
  }
}

export async function extractJobFromUrlAction(
  url: string,
): Promise<JobTrackerExtractResult> {
  try {
    await requireJobTrackerSession();
    const details = await extractJobFromUrl(url);
    return { success: true, details };
  } catch {
    return {
      success: false,
      error: "Couldn't read this page. You can still enter details manually.",
    };
  }
}

export type { JobApplicationInput, SerializedJobApplication } from "@/lib/job-applications";
export type { JobApplicationStatusValue } from "@/lib/job-application-status";
