import { vettingRequirements } from "./job-vetting";
import { credibilityStatuses } from "./job-credibility";
import { employerSizeBands, employerSizeEntities } from "./job-employer-size";
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
    vettingRequirement: z.enum(vettingRequirements).default("Unknown"),
    vettingLevel: text,
    vettingEvidence: text,
    vettingSource: link,
    credibilityCheck: z.enum(credibilityStatuses).default("Not checked"),
    credibilityEvidence: text,
    credibilitySources: z.string().trim().max(8192).default("").refine(value=>value.split(/\n/).map(v=>v.trim()).filter(Boolean).every(v=>{try{return /^https?:$/.test(new URL(v).protocol);}catch{return false;}}),"Use one HTTP or HTTPS source link per line."),
    credibilityCheckedDate: date,
    employerSizeBand: z.enum(employerSizeBands).default("Unknown"),
    employerSizeEntity: z.enum(employerSizeEntities).default("Unknown"),
    employerSizeEntityName: text,
    employerSizeEvidence: text,
    employerSizeSource: link,
    employerSizeCheckedDate: date,
    searchDecision: z.enum(["", "Pursue", "On hold", "Not pursuing"]).default(""),
    decisionReason: text,
    locationEligibility: z.enum(["", "Met", "Not met", "Unknown"]).default(""),
    locationEvidence: text,
    civilianScopeConfirmed: z.boolean().default(false),
    interestTier: z.enum(["", "Preferred", "Adjacent", "Other recorded missions", "Excluded", "Unknown / review needed"]).default(""),
    interestReason: text,
    candidateEvidence: text,
    candidateEvidenceSource: link,
    materialGap: text,
    gapSource: link,
    recruitmentChannel: z.enum(["", "Direct employer", "Recruiting / staffing agency", "Referral", "Unknown"]).default(""),
    recruitmentAgency: text,
    responseStage: z.enum(["", "Response received", "Interview invited", "Interview scheduled", "Interview completed"]).default(""),
    responseEvidence: text,
    responseSource: link,
    governmentRelationship: z.enum(["FEDERAL", "STATE_LOCAL", "PUBLIC_INSTITUTION", "GOVERNMENT_OWNED", "CONTRACTOR", "NON_GOVERNMENT", "INTERNATIONAL", "UNKNOWN"]).default("UNKNOWN"),
    governmentEvidence: text,
    governmentSource: link,
    governmentClassificationOrigin: z.enum(["", "manual", "backfill"]).default(""),
    employerIndustries: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    missionFields: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    employerEvidence: text,
    employerSource: link,
    missionEvidence: text,
    missionSource: link,
    classificationHistory: z.array(z.object({at:z.string(),reason:z.string(),missionFields:z.array(z.string()),missionEvidence:z.string(),missionSource:z.string(),classificationOrigin:z.string()})).default([]),
    classificationOrigin: z.enum(["", "manual", "backfill"]).default(""),
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

export function mergeTrackerDetails(current:unknown, patch:unknown, now=new Date()):TrackerDetails {
  const previous=trackerDetailsSchema.parse(current??{});
  if(patch!==undefined&&(!patch||typeof patch!=="object"||Array.isArray(patch)))throw Error("Invalid tracker details.");
  const next=trackerDetailsSchema.parse({...previous,...(patch as Record<string,unknown>??{}),classificationHistory:previous.classificationHistory});
  if(["missionFields","employerIndustries","missionEvidence","missionSource","employerEvidence","employerSource"].some(key=>JSON.stringify(previous[key as keyof TrackerDetails])!==JSON.stringify(next[key as keyof TrackerDetails]))) {
    next.classificationHistory=[...previous.classificationHistory,{at:now.toISOString(),reason:"Classification edited; prior labels and mission evidence retained.",missionFields:previous.missionFields,missionEvidence:previous.missionEvidence,missionSource:previous.missionSource,classificationOrigin:previous.classificationOrigin}];
  }
  return next;
}
