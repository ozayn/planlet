import type { TrackerDetails } from "./job-tracker-details";
import type { SerializedJobApplication as Job } from "./job-applications";

export const missionLabels = [
  "Museums / art / culture", "Education / learning", "Productivity / planning",
  "Healthcare", "Government / public policy", "Finance", "Media", "Technology",
  "Military / defense", "Defense-adjacent", "Other",
] as const;

// Unknown is represented by no labels, never inferred from an employer name.
export function missionReview(details: TrackerDetails) {
  const missions = details.missionFields ?? [];
  const industries = details.employerIndustries ?? [];
  if ([...missions, ...industries].some(label => label === "Military / defense" || label === "Defense-adjacent"))
    return "Mission conflict";
  if (!missions.length) return "Mission needs review";
  return "Mission recorded";
}
export function missionSummary(details: TrackerDetails) {
  return (details.missionFields ?? []).join(" · ") || "Unknown";
}
export function groupByMission(jobs: Job[]): [string, Job[]][] {
  const groups = new Map<string, Job[]>();
  const seen = new Set<string>();
  for (const job of jobs) {
    if (!job.submissionConfirmed || !job.submittedDate || seen.has(job.id)) continue;
    seen.add(job.id);
    for (const label of new Set(job.trackerDetails.missionFields?.length ? job.trackerDetails.missionFields : ["Unknown"])) {
      groups.set(label, [...(groups.get(label) ?? []), job]);
    }
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}
