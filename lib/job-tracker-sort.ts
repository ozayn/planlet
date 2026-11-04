import type { SerializedJobApplication as Job } from "./job-applications";

// Calendar dates sort independently of the browser's timezone. Legacy dates
// remain usable for browsing without being counted as confirmed submissions.
export function applicationDate(job: Job): string | null {
  const date = job.submissionConfirmed ? job.submittedDate : job.appliedDate;
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
export function sortByApplicationDate(
  jobs: Job[],
  direction: "asc" | "desc" = "desc",
) {
  return [...jobs].sort((a, b) => {
    const left = applicationDate(a),
      right = applicationDate(b);
    if (!left && right) return 1;
    if (left && !right) return -1;
    if (left && right && left !== right)
      return direction === "asc"
        ? left.localeCompare(right)
        : right.localeCompare(left);
    return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
  });
}
