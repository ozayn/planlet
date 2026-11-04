import type { JobApplicationStatus } from "@/app/generated/prisma/client";

import { localDate, weekStart } from "@/lib/job-tracker-insights";
import { getUserTimezone } from "@/lib/user-timezone";
import { canUseJobTrackerFeatures, type UserAccess } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export type CareerJobSummary = {
  applicationsThisWeek: number;
  applied: number;
  interviewing: number;
  rejected: number;
  saved: number;
};

export async function getCareerJobSummary(
  userId: string,
  access: UserAccess,
): Promise<CareerJobSummary | null> {
  if (!canUseJobTrackerFeatures(access)) {
    return null;
  }

  const today = localDate(new Date(), await getUserTimezone(userId));
  const start = weekStart(today);

  const jobs = await prisma.jobApplication.findMany({
    where: { userId },
    select: {
      status: true,
      submissionConfirmed: true,
      submittedDate: true,
    },
  });

  const applicationsThisWeek = jobs.filter(
    (job) =>
      job.submissionConfirmed &&
      !!job.submittedDate &&
      job.submittedDate >= start &&
      job.submittedDate <= today,
  ).length;

  const countByStatus = (status: JobApplicationStatus) =>
    jobs.filter(
      (job) =>
        job.status === status &&
        (status === "SAVED" || job.submissionConfirmed),
    ).length;

  return {
    applicationsThisWeek,
    applied: countByStatus("APPLIED"),
    interviewing: countByStatus("INTERVIEWING"),
    rejected: countByStatus("REJECTED"),
    saved: countByStatus("SAVED"),
  };
}
