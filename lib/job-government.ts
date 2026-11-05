import type { TrackerDetails } from './job-tracker-details';
export const governmentLabels = {
  FEDERAL: 'U.S. federal government',
  STATE_LOCAL: 'U.S. state / local government',
  PUBLIC_INSTITUTION: 'Public university / institution',
  GOVERNMENT_OWNED: 'Government-owned enterprise',
  CONTRACTOR: 'Government contractor',
  NON_GOVERNMENT: 'Non-government',
  INTERNATIONAL: 'International organization',
  UNKNOWN: 'Unknown',
} as const;
export type GovernmentRelationship=keyof typeof governmentLabels;
export function governmentLabel(details: Pick<TrackerDetails,'governmentRelationship'>) {
  return governmentLabels[details.governmentRelationship] ?? governmentLabels.UNKNOWN;
}

export function groupByGovernment(jobs: import('./job-applications').SerializedJobApplication[]): [string, import('./job-applications').SerializedJobApplication[]][] {
  const unique=[...new Map(jobs.filter(job=>job.submissionConfirmed&&job.submittedDate).map(job=>[job.id,job])).values()];
  return Object.values(governmentLabels).map(label=>[label,unique.filter(job=>governmentLabel(job.trackerDetails)===label)]);
}
