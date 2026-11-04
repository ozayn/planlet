export const JOB_APPLICATION_STATUSES = [
  "SAVED",
  "PREPARING",
  "NEEDS_INPUT",
  "READY_TO_SUBMIT",
  "SUBMISSION_FAILED",
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
  PREPARING: "Preparing",
  NEEDS_INPUT: "Needs input",
  READY_TO_SUBMIT: "Ready to submit",
  SUBMISSION_FAILED: "Submission failed",
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
