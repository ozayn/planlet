import {credibilityConcern} from "./job-credibility";
import type { SerializedJobApplication as Job } from "./job-applications";
import type { JobCategory } from "./job-category-types";
import { actualMissions, groupByMission } from "./job-missions";
import { confirmed, outcome, sourceCategory } from "./job-tracker-insights";

export const broadMissionGroups = [
  "Museums / art / culture", "Personal planning / productivity", "Education / learning products",
  "Civilian research tools", "Health / behavior", "Public interest / environment",
  "Knowledge / information access", "Media / communication", "Enterprise workflow / developer tools", "Certification / testing", "Fundraising",
  "Commerce / finance / operations", "Military / defense", "Other recorded missions", "Unknown / review needed",
] as const;
const groupTags: Record<string, readonly string[]> = {
  "Museums / art / culture": ["Museums / art / culture"],
  "Knowledge / information access": ["Libraries / knowledge access"],
  "Media / communication": ["Media"],
  "Personal planning / productivity": ["Personal planning / productivity"],
  "Education / learning products": ["Education / learning", "Learning products", "Career / workforce learning"],
  "Civilian research tools": ["Science / research", "AI research / safety", "Mental health research", "Public opinion / behavioral research", "Simulation / decision tools"],
  "Health / behavior": ["Healthcare", "Clinical care tools", "Health insurance / administration", "Mental health research", "Mental health tools", "Personal health apps / tracking", "Healthcare services", "Life sciences / pharma", "Wearables", "Health data / reporting", "Medical equipment / health logistics"],
  "Public interest / environment": ["Government / public policy", "Climate / environment", "Conservation / exploration", "Energy / utilities"],
  "Enterprise workflow / developer tools": ["Enterprise workflow automation", "Enterprise content / digital assets", "Developer tools / infrastructure", "Developer productivity", "Data / analytics tools", "Technology"],
  "Certification / testing": ["Professional certification / assessment", "Certification / test security"],
  "Fundraising": ["Fundraising / nonprofits"],
  "Commerce / finance / operations": ["Finance", "Payments / fintech", "Insurance / financial services", "Accounting / finance operations", "Workforce / HR", "Transportation", "Logistics / supply chain", "Manufacturing", "Ecommerce / retail", "Events / hospitality", "Professional services", "Law / legal services", "Trust / safety / security"],
  "Military / defense": ["Military / defense", "Defense-adjacent"],
};
// Exact aliases only; do not collapse employer-context labels into actual missions.
export function canonicalIndustry(label: string) {
  const value = label.replace(/^Company:\s*/i, "");
  return ({"Recruitment / staffing":"Recruiting / staffing", "Staffing / recruiting":"Recruiting / staffing", "IT consulting":"Software / IT consulting"} as Record<string,string>)[value] ?? value;
}
export function broadMissions(job: Job, categories: readonly JobCategory[] = []): string[] {
  const tags = actualMissions(job.trackerDetails);
  if (!tags.length) return ["Unknown / review needed"];
  const groups = tags.map(tag => {
    if (["Other", "Productivity / planning"].includes(tag)) return "Unknown / review needed";
    const category = categories.find(c => c.label === tag || c.aliases?.includes(tag));
    if (category?.conflict) return "Military / defense";
    if (category?.broadGroup) return category.broadGroup;
    return Object.entries(groupTags).find(([, labels]) => labels.includes(tag))?.[0] ?? "Other recorded missions";
  });
  // An established defense mission cannot be presented as civilian research.
  const defense = groups.includes("Military / defense");
  return [...new Set(groups.filter(group => !defense || group !== "Civilian research tools"))];
}
export function uniqueJobs(jobs: Job[]) { return [...new Map(jobs.map(j => [j.id,j])).values()]; }
export function submissionRange(jobs: Job[], from: string, to: string) {
  return uniqueJobs(jobs).filter(j => confirmed(j) && j.submittedDate! >= from && j.submittedDate! <= to);
}
export function groupByBroadMission(jobs: Job[], categories: readonly JobCategory[] = []): [string, Job[]][] {
  const groups = new Map<string,Job[]>();
  for (const job of uniqueJobs(jobs).filter(confirmed)) for (const group of broadMissions(job,categories)) groups.set(group,[...(groups.get(group)??[]),job]);
  return [...groups].sort(([a],[b]) => a.localeCompare(b));
}
export function groupByEmployerIndustry(jobs: Job[]): [string,Job[]][] {
  const groups = new Map<string,Job[]>();
  for (const job of uniqueJobs(jobs).filter(confirmed)) {
    const labels = [...(job.trackerDetails.employerIndustries??[]), ...(job.trackerDetails.missionFields??[]).filter(v=>/^Company:/i.test(v))].map(canonicalIndustry);
    for (const label of new Set(labels.length ? labels : ["Unknown"])) groups.set(label,[...(groups.get(label)??[]),job]);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b));
}
export type MissionPreferences = { preferred: string[]; adjacent: string[]; excluded: string[] };
export const defaultMissionPreferences: MissionPreferences = {
  preferred: ["Museums / art / culture", "Personal planning / productivity", "Education / learning products", "Civilian research tools"],
  adjacent: ["Health / behavior", "Public interest / environment"],
  excluded: ["Military / defense", "Defense-adjacent"],
};
export function preferenceAlignment(job: Job, preferences: MissionPreferences, categories: readonly JobCategory[] = []) {
  const tags = actualMissions(job.trackerDetails);
  const labels = [...tags,...broadMissions(job,categories)];
  const match = (values:string[]) => values.filter(value=>labels.includes(value));
  const excluded = match(preferences.excluded);
  if (excluded.length) return {label:"Excluded",reason:`Recorded mission matches: ${excluded.join(", ")}`};
  if (!tags.length || tags.some(tag => ["Productivity / planning", "Other"].includes(tag))) return {label:"Unknown / review needed",reason:"Actual mission is missing or too broad; employer industry does not establish it."};
  const preferred = match(preferences.preferred);
  if (preferred.length) return {label:"Preferred",reason:`Recorded mission matches: ${preferred.join(", ")}`};
  const adjacent = match(preferences.adjacent);
  if (adjacent.length) return {label:"Adjacent",reason:`Recorded mission matches: ${adjacent.join(", ")}`};
  return {label:"Other recorded missions",reason:"Recorded mission does not match your current preference lists."};
}
export function outcomeNeedsReview(job: Job) {
  return job.trackerDetails.responseStage === "Interview invited" || outcome(job)==="Unclassified" ||
    (!job.trackerDetails.responseStage && /interview.{0,35}invit|invit.{0,35}interview/i.test(job.notes??""));
}
export function qualityReviewGroups(jobs: Job[]): [string,Job[]][] {
  const rows=uniqueJobs(jobs);
  return [
    ["Credibility concerns",rows.filter(j=>credibilityConcern(j.trackerDetails))],
    ["Unknown / unclear mission",rows.filter(j=>!actualMissions(j.trackerDetails).length||actualMissions(j.trackerDetails).some(v=>v==="Productivity / planning"||v==="Other"))],
    ["Unknown government relationship",rows.filter(j=>!j.trackerDetails.governmentRelationship||j.trackerDetails.governmentRelationship==="UNKNOWN")],
    ["Missing source",rows.filter(j=>sourceCategory(j)==="Unknown")],
    ["Outcomes needing reconciliation",rows.filter(outcomeNeedsReview)],
  ];
}
export function rangeContext(jobs: Job[], from: string, to: string): [string,Job[]][] {
  return [
    ["Confirmed outside this range",uniqueJobs(jobs).filter(j=>confirmed(j)&&(j.submittedDate!<from||j.submittedDate!>to))],
    ["Unconfirmed / legacy records (all dates)",uniqueJobs(jobs).filter(j=>!confirmed(j))],
  ];
}
export { groupByMission };
