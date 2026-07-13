export type NarrationAudioSourceScheme =
  | "blob"
  | "https"
  | "http"
  | "data"
  | "empty"
  | "other";

export type NarrationAudioSourceOrigin =
  | "fresh_blob"
  | "cached_blob"
  | "same_origin_route"
  | "direct_api_route"
  | "remote_storage"
  | "unknown";

const INVALID_SOURCE_LITERALS = new Set([
  "",
  "undefined",
  "null",
  "[object Object]",
]);

export function parseNarrationAudioSourceScheme(
  url: unknown,
): NarrationAudioSourceScheme {
  if (typeof url !== "string") {
    return "empty";
  }

  const trimmed = url.trim();

  if (!trimmed || INVALID_SOURCE_LITERALS.has(trimmed)) {
    return "empty";
  }

  if (trimmed.startsWith("blob:")) {
    return "blob";
  }

  if (trimmed.startsWith("https:")) {
    return "https";
  }

  if (trimmed.startsWith("http:")) {
    return "http";
  }

  if (trimmed.startsWith("data:")) {
    return "data";
  }

  if (trimmed.startsWith("/")) {
    return "https";
  }

  return "other";
}

export function validateAssignableAudioSource(
  source: unknown,
): "empty_audio_source" | "malformed_audio_url" | null {
  if (typeof source !== "string") {
    return "empty_audio_source";
  }

  const trimmed = source.trim();

  if (!trimmed || INVALID_SOURCE_LITERALS.has(trimmed)) {
    return "empty_audio_source";
  }

  const scheme = parseNarrationAudioSourceScheme(trimmed);

  if (scheme === "other") {
    return "malformed_audio_url";
  }

  if (scheme === "data") {
    return "malformed_audio_url";
  }

  return null;
}

export function isSafeNarrationAudioSource(
  url: string,
  options?: {
    pageOrigin?: string;
    trustedStorageHosts?: readonly string[];
  },
): boolean {
  const validationError = validateAssignableAudioSource(url);

  if (validationError) {
    return false;
  }

  const scheme = parseNarrationAudioSourceScheme(url);

  if (scheme === "blob") {
    return true;
  }

  if (scheme === "data") {
    return false;
  }

  if (url.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol === "javascript:" || parsed.protocol === "file:") {
      return false;
    }

    if (
      options?.pageOrigin &&
      parsed.origin === new URL(options.pageOrigin).origin
    ) {
      return true;
    }

    if (
      parsed.protocol === "https:" &&
      options?.trustedStorageHosts?.includes(parsed.hostname)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function buildSameOriginNarrationChunkUrl(input: {
  sectionId: string;
  slug: string;
  chunkIndex: number;
  regenerate?: boolean;
}): string {
  const params = new URLSearchParams({
    sectionId: input.sectionId,
    slug: input.slug,
    chunkIndex: String(input.chunkIndex),
  });

  if (input.regenerate) {
    params.set("regenerate", "1");
  }

  return `/api/life-lab/narration/chunk?${params.toString()}`;
}

export function buildSameOriginNarrationTestUrl(): string {
  return "/api/life-lab/narration/test";
}

export function isBlobNarrationAudioSource(url: string | null | undefined): boolean {
  return parseNarrationAudioSourceScheme(url ?? "") === "blob";
}

export function categorizeMediaErrorMessage(
  message: string | null | undefined,
  sourceScheme: NarrationAudioSourceScheme,
): "audio_csp_blocked" | "blocked_blob_url" | "unsafe_audio_url" | null {
  const normalized = message?.toLowerCase() ?? "";

  if (!normalized.includes("url safety check")) {
    return null;
  }

  if (sourceScheme === "blob") {
    return "audio_csp_blocked";
  }

  if (sourceScheme === "https" || sourceScheme === "http") {
    return "unsafe_audio_url";
  }

  return "blocked_blob_url";
}
