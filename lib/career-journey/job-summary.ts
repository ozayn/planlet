import type { JobApplicationStatus } from "@/app/generated/prisma/client";

import { formatDateString, getWeekRange } from "@/lib/dates";
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

  const weekRange = getWeekRange(new Date());
  const weekStart = formatDateString(weekRange.start);

  const jobs = await prisma.jobApplication.findMany({
    where: { userId },
    select: {
      status: true,
      appliedDate: true,
      createdAt: true,
    },
  });

  const applicationsThisWeek = jobs.filter((job) => {
    const appliedDate = job.appliedDate?.trim();
    if (appliedDate && appliedDate >= weekStart) {
      return true;
    }

    return formatDateString(job.createdAt) >= weekStart;
  }).length;

  const countByStatus = (status: JobApplicationStatus) =>
    jobs.filter((job) => job.status === status).length;

  return {
    applicationsThisWeek,
    applied: countByStatus("APPLIED"),
    interviewing: countByStatus("INTERVIEWING"),
    rejected: countByStatus("REJECTED"),
    saved: countByStatus("SAVED"),
  };
}
