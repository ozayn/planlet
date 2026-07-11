import type {
  LifeLabNoteMetadata,
  LifeLabNoteSummary,
} from "@/lib/life-lab/constants";
import {
  normalizeLifeLabNoteImage,
  resolveLifeLabNoteImage,
  type ResolvedLifeLabNoteImage,
} from "@/lib/life-lab/note-image";
import { isSafeHttpUrl, normalizeSourceUrl } from "@/lib/life-lab/source-url";

import {
  extractYouTubeVideoId,
  youtubeThumbnailUrlFromVideoId,
} from "@/lib/life-lab/youtube-video-id";

function resolveUrlImage(
  url: string | undefined,
  kind: ResolvedLifeLabNoteImage["kind"] = "image",
): ResolvedLifeLabNoteImage | null {
  const normalized = url ? normalizeSourceUrl(url) : null;

  if (!normalized || !isSafeHttpUrl(normalized)) {
    return null;
  }

  return { url: normalized, kind };
}

export function resolvePlaylistIndexImage(
  metadata?: LifeLabNoteMetadata | null,
): ResolvedLifeLabNoteImage | null {
  if (!metadata) {
    return null;
  }

  const fromThumbnailObject = metadata.thumbnail
    ? resolveMetadataImageField(metadata.thumbnail, "image")
    : null;

  if (fromThumbnailObject) {
    return fromThumbnailObject;
  }

  const fromThumbnailUrl = resolveUrlImage(metadata.thumbnailUrl, "image");

  if (fromThumbnailUrl) {
    return fromThumbnailUrl;
  }

  const fromCoverImage = metadata.coverImage
    ? resolveMetadataImageField(metadata.coverImage, "image")
    : null;

  if (fromCoverImage) {
    return fromCoverImage;
  }

  return resolveLifeLabNoteImage(metadata);
}

function resolveMetadataImageField(
  image: LifeLabNoteMetadata["image"],
  kind: ResolvedLifeLabNoteImage["kind"],
): ResolvedLifeLabNoteImage | null {
  if (!image?.url || !isSafeHttpUrl(image.url)) {
    return null;
  }

  return { ...image, kind };
}

export function youtubeVideoIdFromUrl(url: string): string | null {
  return extractYouTubeVideoId(url);
}

export { extractYouTubeVideoId } from "@/lib/life-lab/youtube-video-id";

export function youtubeThumbnailFromVideoUrl(
  videoUrl: string,
): ResolvedLifeLabNoteImage | null {
  const videoId = extractYouTubeVideoId(videoUrl);

  if (!videoId) {
    return null;
  }

  return {
    url: youtubeThumbnailUrlFromVideoId(videoId),
    kind: "youtube_thumbnail",
    alt: "Playlist thumbnail",
  };
}

function firstChildNoteThumbnail(
  contentNotes: LifeLabNoteSummary[],
): ResolvedLifeLabNoteImage | null {
  for (const note of contentNotes) {
    const image = resolveLifeLabNoteImage(note.metadata);

    if (image) {
      return image;
    }
  }

  return null;
}

function youtubeThumbnailFromNotes(
  contentNotes: LifeLabNoteSummary[],
): ResolvedLifeLabNoteImage | null {
  for (const note of contentNotes) {
    const videoUrl =
      note.metadata?.video_url?.trim() ??
      note.metadata?.source_url?.trim();

    if (!videoUrl) {
      continue;
    }

    const thumbnail = youtubeThumbnailFromVideoUrl(videoUrl);

    if (thumbnail) {
      return thumbnail;
    }
  }

  return null;
}

export function resolvePlaylistCardThumbnail(input: {
  indexNote: LifeLabNoteSummary;
  contentNotes: LifeLabNoteSummary[];
  playlistUrl?: string | null;
}): ResolvedLifeLabNoteImage | null {
  const indexImage = resolvePlaylistIndexImage(input.indexNote.metadata);

  if (indexImage) {
    return indexImage;
  }

  const childImage = firstChildNoteThumbnail(input.contentNotes);

  if (childImage) {
    return childImage;
  }

  const playlistUrl =
    input.playlistUrl ?? input.indexNote.metadata?.playlist_url?.trim() ?? null;

  if (playlistUrl) {
    return youtubeThumbnailFromNotes(input.contentNotes);
  }

  return null;
}

export function normalizePlaylistImageFields(
  raw: Record<string, unknown>,
): Pick<LifeLabNoteMetadata, "thumbnail" | "coverImage" | "thumbnailUrl"> {
  const result: Pick<
    LifeLabNoteMetadata,
    "thumbnail" | "coverImage" | "thumbnailUrl"
  > = {};

  const thumbnail = normalizeLifeLabNoteImage(raw.thumbnail);

  if (thumbnail) {
    result.thumbnail = thumbnail;
  }

  const coverImage = normalizeLifeLabNoteImage(raw.coverImage);

  if (coverImage) {
    result.coverImage = coverImage;
  }

  if (typeof raw.thumbnailUrl === "string" && raw.thumbnailUrl.trim()) {
    result.thumbnailUrl = raw.thumbnailUrl.trim();
  }

  return result;
}
