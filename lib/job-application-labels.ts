import type { JobApplicationStatus } from "@/app/generated/prisma/client";

import { APP_TIMEZONE } from "@/config/time";
import { isValidDateString, parseDateString } from "@/lib/dates";

const statusFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: APP_TIMEZONE,
});

export function getJobApplicationStatusLabel(
  status: JobApplicationStatus,
): string {
  switch (status) {
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    case "INTERVIEWING":
      return "Interviewing";
    case "REJECTED":
      return "Rejected";
    case "OFFER":
      return "Offer";
    case "WITHDRAWN":
      return "Withdrawn";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

export function formatJobAppliedDateLabel(appliedDate: string | null): string | null {
  if (!appliedDate || !isValidDateString(appliedDate)) {
    return null;
  }

  return statusFormatter.format(parseDateString(appliedDate));
}

export function formatJobListMeta(
  appliedDate: string | null,
  status: JobApplicationStatus,
): string {
  const dateLabel = formatJobAppliedDateLabel(appliedDate);
  const statusLabel = getJobApplicationStatusLabel(status);

  if (dateLabel) {
    return `Applied ${dateLabel} · ${statusLabel}`;
  }

  return statusLabel;
}
