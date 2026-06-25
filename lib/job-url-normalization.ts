import { canonicalizeLinkedInJobUrl } from "@/lib/linkedin-job-url";

const TRACKING_QUERY_PARAMS = new Set([
  "trackingid",
  "refid",
  "ref",
  "trk",
  "trkinfo",
  "campaignid",
  "gh_jid",
  "gh_src",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "currentjobid",
  "lever-source",
  "lever-source[]",
]);

function isTrackingQueryParam(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.startsWith("utm_") || TRACKING_QUERY_PARAMS.has(lower);
}

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function buildNormalizedUrl(parsed: URL): string {
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";

  const keysToDelete = [...parsed.searchParams.keys()].filter(isTrackingQueryParam);
  for (const key of keysToDelete) {
    parsed.searchParams.delete(key);
  }

  const pathname = stripTrailingSlash(parsed.pathname);
  const search = parsed.searchParams.toString();
  return search ? `${parsed.origin}${pathname}?${search}` : `${parsed.origin}${pathname}`;
}

export function normalizeJobUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  const linkedInCanonical = canonicalizeLinkedInJobUrl(trimmed);
  if (linkedInCanonical) {
    return linkedInCanonical;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return trimmed;
    }

    return buildNormalizedUrl(parsed);
  } catch {
    return trimmed;
  }
}

/** @deprecated Use normalizeJobUrl */
export function normalizeJobUrlForComparison(url: string): string {
  return normalizeJobUrl(url).toLowerCase();
}

/** Store a cleaned URL without tracking noise. */
export function normalizeJobUrlForStorage(url: string): string {
  return normalizeJobUrl(url);
}
