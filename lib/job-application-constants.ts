export {
  getJobApplicationStatusLabel,
  JOB_APPLICATION_STATUSES,
  type JobApplicationStatusValue,
} from "@/lib/job-application-status";

export type JobApplicationFilter =
  | "ALL"
  | "EVERYTHING"
  | "PREPARING"
  | "NEEDS_INPUT"
  | "READY_TO_SUBMIT"
  | "SUBMISSION_FAILED"
  | "WITHDRAWN"
  | "SAVED"
  | "APPLIED"
  | "INTERVIEWING"
  | "REJECTED"
  | "OFFER"
  | "ARCHIVED";

export const JOB_APPLICATION_FILTERS: Array<{
  value: JobApplicationFilter;
  label: string;
}> = [
  { value: "ALL", label: "Active" },
  { value: "EVERYTHING", label: "All records" },
  { value: "PREPARING", label: "Preparing" },
  { value: "NEEDS_INPUT", label: "Needs input" },
  { value: "READY_TO_SUBMIT", label: "Ready to submit" },
  { value: "SUBMISSION_FAILED", label: "Submission failed" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "SAVED", label: "Saved" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "REJECTED", label: "Rejected" },
  { value: "OFFER", label: "Offer" },
  { value: "ARCHIVED", label: "Archived" },
];

export const MAX_JOB_TITLE_LENGTH = 200;
export const MAX_JOB_COMPANY_LENGTH = 200;
export const MAX_JOB_URL_LENGTH = 2048;
export const MAX_JOB_NOTES_LENGTH = 4000;
export const MAX_JOB_DESCRIPTION_LENGTH = 12000;
export const MAX_JOB_SUMMARY_LENGTH = 2000;
export const MAX_JOB_SOURCE_LENGTH = 200;
export const MAX_JOB_REFERRER_LENGTH = 200;
export const MAX_JOB_LOCATION_LENGTH = 200;
export const MAX_JOB_SALARY_LENGTH = 200;
