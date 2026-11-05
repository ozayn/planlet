import type { TrackerDetails } from "./job-tracker-details";
import type { SerializedJobApplication as Job } from "./job-applications";

export const missionLabels = [
  "Museums / art / culture", "Education / learning", "Personal planning / productivity",
  "Enterprise workflow automation", "Enterprise content / digital assets", "Developer productivity", "Certification / test security", "Productivity / planning",
  "Healthcare", "Government / public policy", "Finance", "Media", "Technology",
  "Military / defense", "Defense-adjacent", "Other",
] as const;

export function actualMissions(details: TrackerDetails) {
  return [...new Set((details.missionFields ?? []).filter(label => !/^Company:/i.test(label) && !["Universities / academic research", "Recruiting / staffing", "Software / IT consulting", "Business / management consulting"].includes(label)))];
}

// Unknown is represented by no labels, never inferred from an employer name.
export function missionReview(details: TrackerDetails, categories: readonly {label:string;conflict:boolean}[] = []) {
  const missions = actualMissions(details);
  const industries = details.employerIndustries ?? [];
  if ([...missions, ...industries].some(label => label === "Military / defense" || label === "Defense-adjacent" || categories.some(c => c.label === label && c.conflict)))
    return "Mission conflict";
  if (!missions.length || missions.some(label=>label==="Productivity / planning" || label==="Other")) return "Mission needs review";
  return "Mission recorded";
}
export function missionSummary(details: TrackerDetails) {
  return actualMissions(details).join(" · ") || "Unknown";
}
export function groupByMission(jobs: Job[]): [string, Job[]][] {
  const groups = new Map<string, Job[]>();
  const seen = new Set<string>();
  for (const job of jobs) {
    if (!job.submissionConfirmed || !job.submittedDate || seen.has(job.id)) continue;
    seen.add(job.id);
    for (const label of new Set(actualMissions(job.trackerDetails).length ? actualMissions(job.trackerDetails) : ["Unknown"])) {
      groups.set(label, [...(groups.get(label) ?? []), job]);
    }
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}
