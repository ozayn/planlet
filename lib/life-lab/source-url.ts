/**
 * Authoring contract (Ava / OpenClaw): include the original video URL in each
 * YouTube learning note frontmatter:
 *
 * ---
 * sourceType: youtube
 * sourceUrl: https://www.youtube.com/watch?v=VIDEO_ID
 * ---
 *
 * Alternative URL keys are accepted; `sourceUrl` is preferred. A body line
 * `Source: https://...` is used only when frontmatter omits a URL.
 */
export const YOUTUBE_VIDEO_NOTE_SOURCE_TYPE = "youtube";

export const SOURCE_URL_FRONTMATTER_KEYS = [
  "sourceUrl",
  "source_url",
  "videoUrl",
  "video_url",
  "youtubeUrl",
  "youtube_url",
  "originalUrl",
  "original_url",
  "url",
] as const;

const SOURCE_LINE_PATTERNS = [
  /^Source:\s*(https?:\/\/\S+)/im,
  /^\*\*Source\*\*:\s*(https?:\/\/\S+)/im,
  /^Source:\s*\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/im,
  /^\*\*Source\*\*:\s*\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/im,
];

const FIRST_YOUTUBE_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^\s)\]]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)[^\s)\]]+/i;

export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeSourceUrl(value: string): string | null {
  const trimmed = value.trim().replace(/[),.;]+$/g, "");

  return isSafeHttpUrl(trimmed) ? trimmed : null;
}

export function pickSourceUrlFromFrontmatterRaw(
  raw: Record<string, unknown>,
): string | null {
  for (const key of SOURCE_URL_FRONTMATTER_KEYS) {
    const value = raw[key];

    if (typeof value === "string") {
      const normalized = normalizeSourceUrl(value);

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

export function extractSourceUrlFromMetadata(
  metadata: {
    source_url?: string;
    video_url?: string;
    sourceUrl?: string;
    youtubeUrl?: string;
    youtube_url?: string;
  } | null | undefined,
): string | null {
  if (!metadata) {
    return null;
  }

  for (const value of [
    metadata.source_url,
    metadata.video_url,
    metadata.sourceUrl,
    metadata.youtubeUrl,
    metadata.youtube_url,
  ]) {
    if (typeof value === "string") {
      const normalized = normalizeSourceUrl(value);

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

export function extractSourceUrlFromBody(body: string): string | null {
  for (const pattern of SOURCE_LINE_PATTERNS) {
    const match = body.match(pattern);

    if (match?.[1]) {
      const normalized = normalizeSourceUrl(match[1]);

      if (normalized) {
        return normalized;
      }
    }
  }

  const youtubeMatch = body.match(FIRST_YOUTUBE_URL_PATTERN);

  if (youtubeMatch?.[0]) {
    return normalizeSourceUrl(youtubeMatch[0]);
  }

  return null;
}

export function resolveLifeLabSourceUrl(input: {
  metadata?: {
    source_url?: string;
    video_url?: string;
    sourceUrl?: string;
    youtubeUrl?: string;
    youtube_url?: string;
  } | null;
  body?: string;
}): string | null {
  const fromMetadata = extractSourceUrlFromMetadata(input.metadata);

  if (fromMetadata) {
    return fromMetadata;
  }

  if (input.body) {
    return extractSourceUrlFromBody(input.body);
  }

  return null;
}

export function stripSourceUrlLineFromMarkdown(
  body: string,
  sourceUrl: string,
): string {
  if (!sourceUrl.trim()) {
    return body;
  }

  const escapedUrl = sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linePattern = new RegExp(
    `^\\s*(?:\\*\\*Source\\*\\*|Source):\\s*${escapedUrl}\\s*$`,
    "gim",
  );

  return body
    .replace(linePattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getSourcePlatformLabel(sourceUrl: string): string {
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) {
      return "YouTube";
    }

    if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
      return "Vimeo";
    }
  } catch {
    return "Source";
  }

  return "Source";
}

export function getSourceLinkLabel(platformLabel: string): string {
  if (platformLabel === "YouTube" || platformLabel === "Vimeo") {
    return `${platformLabel} · Open original ↗`;
  }

  return "Open video ↗";
}

export function getSourceLinkAriaLabel(platformLabel: string): string {
  if (platformLabel === "YouTube") {
    return "Open original YouTube video";
  }

  if (platformLabel === "Vimeo") {
    return "Open original Vimeo video";
  }

  return "Open original video";
}

export function getSourceLinkTitle(platformLabel: string): string {
  return getSourceLinkAriaLabel(platformLabel);
}
