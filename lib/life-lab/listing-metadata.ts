import type { LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import {
  extractSourceUrlFromBody,
  extractSourceUrlFromMetadata,
} from "@/lib/life-lab/source-url";
import { resolveYouTubeThumbnail } from "@/lib/life-lab/youtube-thumbnail";
import { extractYouTubeVideoId } from "@/lib/life-lab/youtube-video-id";

/**
 * Slim metadata kept on browse/listing cards so thumbnails work without
 * re-running full note enrichment on every request.
 */
export type LifeLabListingMetadata = Pick<
  LifeLabNoteMetadata,
  | "sourceUrl"
  | "source_url"
  | "video_url"
  | "youtubeUrl"
  | "youtube_url"
  | "thumbnailUrl"
  | "thumbnail_url"
  | "thumbnail"
  | "coverImage"
  | "image"
  | "imageUrl"
  | "youtube_thumbnail"
  | "videoId"
  | "youtubeVideoId"
  | "video_id"
  | "youtube_video_id"
  | "channel"
  | "channelName"
  | "youtubeChannel"
  | "playlist"
  | "playlistId"
  | "playlist_id"
  | "playlistAssetPath"
  | "type"
  | "source"
>;

function stringField(
  metadata: LifeLabNoteMetadata,
  keys: Array<keyof LifeLabNoteMetadata>,
): string | undefined {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export function hasListingThumbnailInputs(
  metadata: LifeLabNoteMetadata | null | undefined,
): boolean {
  if (!metadata) {
    return false;
  }

  if (extractSourceUrlFromMetadata(metadata)) {
    return true;
  }

  if (
    stringField(metadata, [
      "thumbnailUrl",
      "thumbnail_url",
      "imageUrl",
      "youtubeVideoId",
      "videoId",
      "youtube_video_id",
      "video_id",
    ])
  ) {
    return true;
  }

  if (metadata.thumbnail?.url || metadata.coverImage?.url || metadata.image?.url) {
    return true;
  }

  return false;
}

/**
 * Extract listing/thumbnail fields from note Markdown once.
 * Frontmatter is preferred; body `Source:` is used only as fallback.
 * Must run on the raw file before display stripping removes source lines.
 */
export function extractLifeLabListingMetadata(
  rawContent: string,
): LifeLabListingMetadata {
  const { metadata, body } = parseLifeLabFrontmatter(rawContent);
  const listing: LifeLabListingMetadata = {};

  const copyKeys: Array<keyof LifeLabListingMetadata> = [
    "sourceUrl",
    "source_url",
    "video_url",
    "youtubeUrl",
    "youtube_url",
    "thumbnailUrl",
    "thumbnail_url",
    "thumbnail",
    "coverImage",
    "image",
    "imageUrl",
    "youtube_thumbnail",
    "videoId",
    "youtubeVideoId",
    "video_id",
    "youtube_video_id",
    "channel",
    "channelName",
    "youtubeChannel",
    "playlist",
    "playlistId",
    "playlist_id",
    "playlistAssetPath",
    "type",
    "source",
  ];

  for (const key of copyKeys) {
    const value = metadata[key];

    if (value != null && value !== "") {
      (listing as Record<string, unknown>)[key] = value;
    }
  }

  let sourceUrl = extractSourceUrlFromMetadata(listing);

  if (!sourceUrl) {
    sourceUrl = extractSourceUrlFromBody(body);

    if (sourceUrl) {
      listing.source_url = sourceUrl;
      listing.video_url = sourceUrl;
      listing.sourceUrl = sourceUrl;
    }
  } else {
    listing.source_url = listing.source_url ?? sourceUrl;
    listing.video_url = listing.video_url ?? sourceUrl;
    listing.sourceUrl = listing.sourceUrl ?? sourceUrl;
  }

  const explicitVideoId = stringField(listing, [
    "youtubeVideoId",
    "videoId",
    "youtube_video_id",
    "video_id",
  ]);
  const videoId =
    explicitVideoId ??
    (sourceUrl ? extractYouTubeVideoId(sourceUrl) : null) ??
    undefined;

  if (videoId) {
    listing.youtubeVideoId = videoId;
    listing.videoId = videoId;
  }

  const explicitThumbnail = stringField(listing, [
    "thumbnailUrl",
    "thumbnail_url",
    "imageUrl",
  ]);
  const resolvedThumbnail =
    explicitThumbnail ??
    resolveYouTubeThumbnail({
      thumbnailUrl: explicitThumbnail,
      sourceUrl: sourceUrl ?? null,
      youtubeVideoId: videoId ?? null,
      videoId: videoId ?? null,
    });

  if (resolvedThumbnail) {
    listing.thumbnailUrl = resolvedThumbnail;
  }

  return listing;
}

export function mergeListingMetadata(
  existing: LifeLabNoteMetadata | undefined,
  listing: LifeLabListingMetadata | null | undefined,
): LifeLabNoteMetadata | undefined {
  if (!listing || Object.keys(listing).length === 0) {
    return existing;
  }

  return {
    ...(existing ?? {}),
    ...listing,
  };
}
