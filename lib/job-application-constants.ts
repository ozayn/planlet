import type { JobApplicationStatus } from "@/app/generated/prisma/client";

export const JOB_APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "INTERVIEWING",
  "REJECTED",
  "OFFER",
  "WITHDRAWN",
  "ARCHIVED",
] as const satisfies readonly JobApplicationStatus[];

export type JobApplicationFilter =
  | "ALL"
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
  { value: "ALL", label: "All" },
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
