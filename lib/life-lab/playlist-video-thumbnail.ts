import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import {
  resolveLifeLabNoteImage,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";
import { resolvePlaylistIndexImage } from "@/lib/life-lab/playlist-thumbnail";
import { isSafeHttpUrl, normalizeSourceUrl } from "@/lib/life-lab/source-url";
import { resolveYouTubeThumbnail } from "@/lib/life-lab/youtube-thumbnail";
import { isYouTubeVideoId } from "@/lib/life-lab/youtube-video-id";

function resolveUrlThumbnail(
  url: string | undefined,
  kind: ResolvedLifeLabNoteImage["kind"] = "image",
  alt?: string,
): ResolvedLifeLabNoteImage | null {
  const normalized = url ? normalizeSourceUrl(url) : null;

  if (!normalized || !isSafeHttpUrl(normalized)) {
    return null;
  }

  return {
    url: normalized,
    kind,
    alt,
  };
}

function resolveMetadataVideoId(
  metadata?: LifeLabNoteMetadata | null,
): string | null {
  if (!metadata) {
    return null;
  }

  const candidates = [
    metadata.videoId,
    metadata.youtubeVideoId,
    metadata.video_id,
    metadata.youtube_video_id,
  ];

  for (const candidate of candidates) {
    if (candidate && isYouTubeVideoId(candidate)) {
      return candidate;
    }
  }

  return null;
}

function collectVideoUrlCandidates(input: {
  metadata?: LifeLabNoteMetadata | null;
  videoUrl?: string | null;
}): string[] {
  const candidates = [
    input.videoUrl,
    input.metadata?.video_url,
    input.metadata?.source_url,
    input.metadata?.youtubeUrl,
    input.metadata?.youtube_url,
    input.metadata?.sourceUrl,
    input.metadata?.source_url,
  ];

  return candidates
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function toResolvedThumbnail(
  url: string,
  title?: string,
): ResolvedLifeLabNoteImage {
  return {
    url,
    kind: url.includes("i.ytimg.com") ? "youtube_thumbnail" : "image",
    alt: title ? `${title} thumbnail` : "Video thumbnail",
  };
}

export function resolvePlaylistVideoRowThumbnail(input: {
  metadata?: LifeLabNoteMetadata | null;
  videoUrl?: string | null;
  title?: string;
}): ResolvedLifeLabNoteImage | null {
  const title = input.title?.trim();
  const metadata = input.metadata;

  const fromPlaylistFields = resolvePlaylistIndexImage(metadata);

  if (fromPlaylistFields) {
    return fromPlaylistFields;
  }

  const fromThumbnailUrl = resolveUrlThumbnail(
    metadata?.thumbnail_url,
    "image",
    title ? `${title} thumbnail` : undefined,
  );

  if (fromThumbnailUrl) {
    return fromThumbnailUrl;
  }

  const fromImageUrl = resolveUrlThumbnail(
    metadata?.imageUrl,
    "image",
    title ? `${title} thumbnail` : undefined,
  );

  if (fromImageUrl) {
    return fromImageUrl;
  }

  const fromNoteImage = resolveLifeLabNoteImage(metadata);

  if (fromNoteImage) {
    return fromNoteImage;
  }

  const metadataVideoId = resolveMetadataVideoId(metadata);
  const urlCandidates = collectVideoUrlCandidates(input);

  const fromExplicitIds = resolveYouTubeThumbnail({
    youtubeVideoId: metadataVideoId ?? undefined,
    videoId: metadataVideoId ?? undefined,
  });

  if (fromExplicitIds) {
    return toResolvedThumbnail(fromExplicitIds, title);
  }

  for (const candidate of urlCandidates) {
    const resolved = resolveYouTubeThumbnail({
      sourceUrl: candidate,
    });

    if (resolved) {
      return toResolvedThumbnail(resolved, title);
    }
  }

  return null;
}
