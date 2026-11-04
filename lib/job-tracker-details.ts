import { z } from "zod";
const text = z.string().trim().max(2000).default("");
const link = z
  .union([
    z.literal(""),
    z
      .url()
      .max(2048)
      .refine((v) => /^https?:/.test(v), "Use an HTTP or HTTPS link"),
  ])
  .default("");
const amount = z
  .union([
    z.literal(""),
    z
      .string()
      .max(18)
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a nonnegative amount"),
  ])
  .default("");
const date = z.union([z.literal(""), z.iso.date()]).default("");
export const trackerDetailsSchema = z
  .object({
    roleCategory: text,
    qualificationGaps: text,
    blockerType: z
      .enum([
        "",
        "Missing answer",
        "Missing document",
        "Technical issue",
        "Other",
      ])
      .default(""),
    blockerNote: text,
    salaryMin: amount,
    salaryMax: amount,
    currency: z
      .union([z.literal(""), z.string().regex(/^[A-Z]{3}$/)])
      .default(""),
    payPeriod: z.enum(["", "Hour", "Day", "Week", "Month", "Year"]).default(""),
    requestedSalary: amount,
    employmentType: z
      .enum([
        "",
        "Full-time",
        "Part-time",
        "Contract",
        "Temporary",
        "Internship",
      ])
      .default(""),
    workArrangement: z.enum(["", "Remote", "Hybrid", "On-site"]).default(""),
    officeDays: z
      .union([z.literal(""), z.string().regex(/^[0-7]$/)])
      .default(""),
    deadline: date,
    employerJobId: text,
    resumeVersion: text,
    resumeLink: link,
    coverLetterVersion: text,
    coverLetterLink: link,
    materialsNeedReview: z.boolean().default(false),
    nextAction: text,
    dueDate: date,
    contactName: text,
    linkedInUrl: link,
    outreachStatus: z
      .enum(["", "Identified", "Planned", "Contacted", "Replied"])
      .default(""),
  })
  .refine(
    (v) =>
      !v.salaryMin ||
      !v.salaryMax ||
      Number(v.salaryMin) <= Number(v.salaryMax),
    "Salary minimum must not exceed maximum",
  );
export type TrackerDetails = z.infer<typeof trackerDetailsSchema>;
export const emptyTrackerDetails = () => trackerDetailsSchema.parse({});
export type TrackerEvent = {
  at: string;
  from: string | null;
  to: string;
  kind: "status" | "confirmed" | "baseline";
  date?: string;
  materials?: Pick<
    TrackerDetails,
    "resumeVersion" | "resumeLink" | "coverLetterVersion" | "coverLetterLink"
  >;
};
export function buildTrackerEvent(
  from: string | null,
  to: string,
  details: TrackerDetails,
  confirm: boolean,
  date: string,
  now = new Date(),
): TrackerEvent {
  return {
    at: now.toISOString(),
    from,
    to,
    kind: confirm ? "confirmed" : "status",
    ...(confirm
      ? {
          date,
          materials: {
            resumeVersion: details.resumeVersion,
            resumeLink: details.resumeLink,
            coverLetterVersion: details.coverLetterVersion,
            coverLetterLink: details.coverLetterLink,
          },
        }
      : {}),
  };
}
export function needsAttention(job: {
  status: string;
  trackerDetails: TrackerDetails;
}) {
  return (
    job.status === "NEEDS_INPUT" ||
    job.status === "SUBMISSION_FAILED" ||
    !!job.trackerDetails.blockerType ||
    !!job.trackerDetails.blockerNote ||
    job.trackerDetails.materialsNeedReview
  );
}
export function duplicateReason(
  a: {
    url?: string | null;
    company: string;
    title: string;
    trackerDetails: TrackerDetails;
  },
  b: typeof a,
) {
  if (a.url && a.url === b.url) return "Matching URL";
  if (
    a.company.trim() &&
    a.company.trim().toLowerCase() === b.company.trim().toLowerCase()
  ) {
    if (
      a.trackerDetails.employerJobId &&
      a.trackerDetails.employerJobId === b.trackerDetails.employerJobId
    )
      return "Matching employer/job ID";
    if (a.title.trim().toLowerCase() === b.title.trim().toLowerCase())
      return "Possible company/title match";
  }
  return null;
}
