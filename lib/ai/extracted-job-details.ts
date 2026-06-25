export type ExtractedJobDetails = {
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  summary?: string;
  likelySkills?: string[];
  applicationDeadline?: string;
};

export function hasExtractedContent(details: ExtractedJobDetails): boolean {
  return Boolean(
    details.title?.trim() ||
      details.company?.trim() ||
      details.location?.trim() ||
      details.salary?.trim() ||
      details.description?.trim() ||
      details.summary?.trim() ||
      details.applicationDeadline?.trim() ||
      (details.likelySkills?.length ?? 0) > 0,
  );
}
