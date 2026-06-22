export const JOB_APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "INTERVIEWING",
  "REJECTED",
  "OFFER",
  "WITHDRAWN",
  "ARCHIVED",
] as const;

export type JobApplicationStatusValue =
  (typeof JOB_APPLICATION_STATUSES)[number];

export const JOB_APPLICATION_STATUS_LABELS = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  REJECTED: "Rejected",
  OFFER: "Offer",
  WITHDRAWN: "Withdrawn",
  ARCHIVED: "Archived",
} satisfies Record<JobApplicationStatusValue, string>;

export function isJobApplicationStatus(
  value: string,
): value is JobApplicationStatusValue {
  return (JOB_APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function getJobApplicationStatusLabel(
  status: JobApplicationStatusValue,
): string {
  return JOB_APPLICATION_STATUS_LABELS[status];
}
