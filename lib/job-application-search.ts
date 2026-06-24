import type { SerializedJobApplication } from "@/lib/job-applications";
import { getJobApplicationStatusLabel } from "@/lib/job-application-labels";

function searchableJobFields(job: SerializedJobApplication): Array<string | null> {
  return [
    job.title,
    job.company,
    job.url,
    job.description,
    job.summary,
    job.notes,
    job.source,
    job.referrer,
    job.location,
    job.salary,
    getJobApplicationStatusLabel(job.status),
  ];
}

export function jobMatchesSearch(
  job: SerializedJobApplication,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return searchableJobFields(job).some((field) =>
    field?.trim().toLowerCase().includes(normalizedQuery),
  );
}
