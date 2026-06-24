import { APP_TIMEZONE } from "@/config/time";
import { isValidDateString, parseDateString } from "@/lib/dates";
import {
  getJobApplicationStatusLabel,
  type JobApplicationStatusValue,
} from "@/lib/job-application-status";

const statusFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: APP_TIMEZONE,
});

export { getJobApplicationStatusLabel };

export function formatJobAppliedDateLabel(appliedDate: string | null): string | null {
  if (!appliedDate || !isValidDateString(appliedDate)) {
    return null;
  }

  return statusFormatter.format(parseDateString(appliedDate));
}

export function formatJobListMeta(
  appliedDate: string | null,
  status: JobApplicationStatusValue,
): string {
  const dateLabel = formatJobAppliedDateLabel(appliedDate);
  const statusLabel = getJobApplicationStatusLabel(status);

  if (dateLabel) {
    return `Applied ${dateLabel} · ${statusLabel}`;
  }

  return statusLabel;
}

const updatedFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: APP_TIMEZONE,
});

export function formatJobUpdatedLabel(updatedAt: string): string {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return updatedFormatter.format(date);
}

export function formatJobTableAppliedDate(
  appliedDate: string | null,
): string {
  return formatJobAppliedDateLabel(appliedDate) ?? "—";
}
