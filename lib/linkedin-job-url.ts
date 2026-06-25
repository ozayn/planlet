const LINKEDIN_HOST_PATTERN = /(^|\.)linkedin\.com$/i;

export type LinkedInSlugDetails = {
  jobId: string;
  slug: string | null;
  possibleTitle: string | null;
  possibleCompany: string | null;
};

function kebabToTitleCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isLinkedInHost(value: string | URL): boolean {
  try {
    const parsed = typeof value === "string" ? new URL(value.trim()) : value;
    return LINKEDIN_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function isLinkedInJobUrl(value: string | URL): boolean {
  return extractLinkedInJobId(value) !== null;
}

export function extractLinkedInJobId(value: string | URL): string | null {
  try {
    const parsed = typeof value === "string" ? new URL(value.trim()) : value;
    if (!isLinkedInHost(parsed)) {
      return null;
    }

    const pathMatch = parsed.pathname.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d+)\/?$/i);
    if (pathMatch?.[1]) {
      return pathMatch[1];
    }

    const queryId = parsed.searchParams.get("currentJobId")?.trim();
    if (queryId && /^\d+$/.test(queryId)) {
      return queryId;
    }

    return null;
  } catch {
    return null;
  }
}

export function canonicalizeLinkedInJobUrl(value: string): string | null {
  const jobId = extractLinkedInJobId(value);
  if (!jobId) {
    return null;
  }

  return `https://www.linkedin.com/jobs/view/${jobId}`;
}

export function extractLinkedInSlugDetails(
  value: string | URL,
): LinkedInSlugDetails | null {
  const jobId = extractLinkedInJobId(value);
  if (!jobId) {
    return null;
  }

  try {
    const parsed = typeof value === "string" ? new URL(value.trim()) : value;
    const pathMatch = parsed.pathname.match(/\/jobs\/view\/([^/?#]+)\/?$/i);
    if (!pathMatch?.[1]) {
      return { jobId, slug: null, possibleTitle: null, possibleCompany: null };
    }

    const segment = pathMatch[1];
    if (/^\d+$/.test(segment)) {
      return { jobId, slug: null, possibleTitle: null, possibleCompany: null };
    }

    const slugSuffix = `-${jobId}`;
    if (!segment.endsWith(slugSuffix)) {
      return { jobId, slug: null, possibleTitle: null, possibleCompany: null };
    }

    const slug = segment.slice(0, -slugSuffix.length);
    if (!slug) {
      return { jobId, slug: null, possibleTitle: null, possibleCompany: null };
    }

    const atIndex = slug.indexOf("-at-");
    if (atIndex === -1) {
      return { jobId, slug, possibleTitle: null, possibleCompany: null };
    }

    const titlePart = slug.slice(0, atIndex);
    const companyPart = slug.slice(atIndex + "-at-".length);

    return {
      jobId,
      slug,
      possibleTitle: titlePart ? kebabToTitleCase(titlePart) : null,
      possibleCompany: companyPart ? kebabToTitleCase(companyPart) : null,
    };
  } catch {
    return { jobId, slug: null, possibleTitle: null, possibleCompany: null };
  }
}

export function linkedInSlugToJobFields(
  details: LinkedInSlugDetails,
): { title?: string; company?: string } {
  const fields: { title?: string; company?: string } = {};

  if (details.possibleTitle?.trim()) {
    fields.title = details.possibleTitle.trim();
  }

  if (details.possibleCompany?.trim()) {
    fields.company = details.possibleCompany.trim();
  }

  return fields;
}
