import { missionReview } from "./job-missions";
import type { SerializedJobApplication as Job } from "./job-applications";
import type { JobApplicationFilter } from "./job-application-constants";
import { needsAttention } from "./job-tracker-details";
import { followUpDue } from "./job-tracker-insights";
export const emptyJobFilters = () => ({
  company: "",
  government: "",
  mission: "",
  industry: "",
  missionReview: "",
  qualificationGap: "",
  role: "",
  arrangement: "",
  salary: "",
  currency: "",
  period: "",
  from: "",
  to: "",
});
export type JobFilters = ReturnType<typeof emptyJobFilters>;
export function matchesJobFilters(
  job: Job,
  status: JobApplicationFilter,
  view: string,
  fields: JobFilters,
  today: string,
  categories: readonly {label:string;conflict:boolean}[] = [],
) {
  const d = job.trackerDetails;
  if (fields.government && (d.governmentRelationship ?? "UNKNOWN") !== fields.government) return false;
  if (fields.mission && !(fields.mission === "Unknown" ? !d.missionFields?.length : d.missionFields?.includes(fields.mission))) return false;
  if (fields.industry && !(fields.industry === "Unknown" ? !d.employerIndustries?.length : d.employerIndustries?.includes(fields.industry))) return false;
  if (fields.missionReview && missionReview(d, categories) !== fields.missionReview) return false;
  if (status === "ALL" && job.status === "ARCHIVED") return false;
  if (status !== "ALL" && status !== "EVERYTHING" && job.status !== status)
    return false;
  if (view === "attention" && !needsAttention(job)) return false;
  if (view === "followup" && !followUpDue(job, today)) return false;
  if (
    view === "today" &&
    (!job.submissionConfirmed || job.submittedDate !== today)
  )
    return false;
  if (
    !job.company.toLowerCase().includes(fields.company.toLowerCase()) ||
    !job.title.toLowerCase().includes(fields.role.toLowerCase())
  )
    return false;
  if (
    fields.qualificationGap &&
    !d.qualificationGaps
      .toLowerCase()
      .includes(fields.qualificationGap.toLowerCase())
  )
    return false;
  if (fields.arrangement && d.workArrangement !== fields.arrangement)
    return false;
  if (
    fields.salary &&
    ((!d.salaryMax && !d.salaryMin) ||
      Number(d.salaryMax || d.salaryMin) < Number(fields.salary))
  )
    return false;
  if (fields.currency && d.currency !== fields.currency.toUpperCase())
    return false;
  if (fields.period && d.payPeriod !== fields.period) return false;
  if (
    (fields.from || fields.to) &&
    (!job.submissionConfirmed ||
      !job.submittedDate ||
      (fields.from && job.submittedDate < fields.from) ||
      (fields.to && job.submittedDate > fields.to))
  )
    return false;
  return true;
}
