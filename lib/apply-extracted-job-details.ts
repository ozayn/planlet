import type { ExtractedJobDetails } from "@/lib/ai/extract-job-from-url";

export function mergeExtractedJobNotes(
  currentNotes: string,
  details: ExtractedJobDetails,
): string {
  const merged = [
    currentNotes.trim(),
    details.summary?.trim(),
    details.likelySkills?.length
      ? `Skills: ${details.likelySkills.join(", ")}`
      : "",
    details.applicationDeadline?.trim()
      ? `Deadline: ${details.applicationDeadline.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return merged || currentNotes;
}

export function applyExtractedJobToAddForm<
  T extends {
    title: string;
    company: string;
    notes: string;
  },
>(current: T, details: ExtractedJobDetails): T {
  return {
    ...current,
    title: details.title?.trim() || current.title,
    company: details.company?.trim() || current.company,
    notes: mergeExtractedJobNotes(current.notes, details),
  };
}

export function applyExtractedJobToEditForm<
  T extends {
    title: string;
    company: string;
    location: string;
    salary: string;
    description: string;
    summary: string;
  },
>(current: T, details: ExtractedJobDetails): T {
  return {
    ...current,
    title: details.title?.trim() || current.title,
    company: details.company?.trim() || current.company,
    location: details.location?.trim() || current.location,
    salary: details.salary?.trim() || current.salary,
    description: details.description?.trim() || current.description,
    summary: details.summary?.trim() || current.summary,
  };
}
