import { isSafeHttpUrl, normalizeSourceUrl } from "@/lib/life-lab/source-url";
import {
  extractYouTubeVideoId,
  isYouTubeVideoId,
  youtubeThumbnailUrlFromVideoId,
} from "@/lib/life-lab/youtube-video-id";

export type ResolveYouTubeThumbnailInput = {
  thumbnailUrl?: string | null;
  sourceUrl?: string | null;
  youtubeVideoId?: string | null;
  videoId?: string | null;
};

/**
 * Resolves a YouTube video thumbnail URL from explicit fields.
 * Returns null when no thumbnail can be derived (callers show UI fallback).
 */
export function resolveYouTubeThumbnail(
  input: ResolveYouTubeThumbnailInput,
): string | null {
  const explicitThumbnail = input.thumbnailUrl?.trim();

  if (explicitThumbnail) {
    const normalized = normalizeSourceUrl(explicitThumbnail);

    if (normalized && isSafeHttpUrl(normalized)) {
      return normalized;
    }
  }

  const idCandidates = [
    input.youtubeVideoId,
    input.videoId,
  ];

  for (const candidate of idCandidates) {
    const trimmed = candidate?.trim();

    if (trimmed && isYouTubeVideoId(trimmed)) {
      return youtubeThumbnailUrlFromVideoId(trimmed);
    }
  }

  const sourceUrl = input.sourceUrl?.trim();

  if (sourceUrl) {
    const videoId = extractYouTubeVideoId(sourceUrl);

    if (videoId) {
      return youtubeThumbnailUrlFromVideoId(videoId);
    }
  }

  return null;
}
