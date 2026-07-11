import type {
  LifeLabNoteMetadata,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  isPlaylistAssetRelativePath,
  PLAYLIST_ASSET_FILENAMES,
} from "@/lib/life-lab/playlist-asset-paths";
import { isReadmeSlug, relativePathFilename } from "@/lib/life-lab/slug";
import {
  COLLECTION_EXCLUDED_FILENAMES,
  isCollectionIndexFilename,
} from "@/lib/life-lab/collection";
import {
  isInternalPlaylistTitle,
  isNonPlayableMetadataNote,
  isPlayableYoutubeNote,
  NON_PLAYABLE_NOTE_FILENAMES,
} from "@/lib/life-lab/youtube-browse";

export type LifeLabFileRole =
  | "playlist"
  | "playlistArtifact"
  | "standaloneVideo"
  | "playlistVideo"
  | "reference"
  | "archive"
  | "about"
  | "internal";

export type LifeLabFileClassificationInput = {
  sectionId?: LifeLabSectionId;
  relativePath: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
  title?: string;
};

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

function filename(relativePath: string): string {
  return relativePathFilename(relativePath).toLowerCase();
}

function isKnownPlaylistArtifactFilename(name: string): boolean {
  return PLAYLIST_ASSET_FILENAMES.some((assetFilename) => assetFilename === name);
}

function isYoutubeVideoRelativePath(
  relativePath: string,
  subfolderLabel?: string | null,
): boolean {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();

  return (
    subfolderLabel === "videos" ||
    normalized.startsWith("videos/") ||
    normalized.includes("/videos/")
  );
}

export function isPlaylistsTopLevelIndexPath(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);

  if (!normalized.startsWith("playlists/")) {
    return false;
  }

  if (normalized.startsWith("playlists/assets/")) {
    return false;
  }

  const rest = normalized.slice("playlists/".length);

  if (!rest || rest.includes("/")) {
    return false;
  }

  const lower = rest.toLowerCase();

  if (!lower.endsWith(".md")) {
    return false;
  }

  if (COLLECTION_EXCLUDED_FILENAMES.has(lower)) {
    return false;
  }

  if (isKnownPlaylistArtifactFilename(lower)) {
    return false;
  }

  return true;
}

export function isPlaylistIndexFilename(relativePath: string | undefined): boolean {
  if (!relativePath) {
    return false;
  }

  const lower = filename(relativePath);

  if (isKnownPlaylistArtifactFilename(lower)) {
    return false;
  }

  if (COLLECTION_EXCLUDED_FILENAMES.has(lower)) {
    return false;
  }

  return isCollectionIndexFilename(lower);
}

export function classifyLifeLabFile(
  input: LifeLabFileClassificationInput,
): LifeLabFileRole | null {
  const relativePath = normalizeRelativePath(input.relativePath);
  const lowerFilename = filename(relativePath);
  const sectionId = input.sectionId;

  if (isReadmeSlug(relativePath.replace(/\//g, "__").replace(/\.md$/i, ""))) {
    return "about";
  }

  if (lowerFilename === "readme.md") {
    return "about";
  }

  if (isPlaylistAssetRelativePath(relativePath)) {
    return "playlistArtifact";
  }

  if (isKnownPlaylistArtifactFilename(lowerFilename)) {
    return "playlistArtifact";
  }

  if (NON_PLAYABLE_NOTE_FILENAMES.has(lowerFilename)) {
    return "reference";
  }

  if (NON_PLAYABLE_METADATA_FILENAMES.has(lowerFilename)) {
    return "reference";
  }

  if (input.subfolderLabel?.toLowerCase() === "archive" || relativePath.startsWith("archive/")) {
    return "archive";
  }

  if (input.metadata?.type === "playlist-index") {
    return "playlist";
  }

  if (isPlaylistIndexFilename(relativePath) && isPlaylistsTopLevelIndexPath(relativePath)) {
    return "playlist";
  }

  if (sectionId === "youtube-learning" && isPlaylistsTopLevelIndexPath(relativePath)) {
    return "playlist";
  }

  if (sectionId !== "youtube-learning") {
    return input.subfolderLabel ? "reference" : "reference";
  }

  const playlistTitle = input.metadata?.playlist?.trim();

  const noteLike = {
    slug: relativePath.replace(/\//g, "__").replace(/\.md$/i, ""),
    title: input.title ?? relativePath,
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: input.subfolderLabel ?? null,
    fileId: "",
    relativePath,
    metadata: input.metadata,
  };

  if (isNonPlayableMetadataNote(noteLike)) {
    return "reference";
  }

  if (!input.subfolderLabel && !playlistTitle) {
    return "reference";
  }

  if (!isPlayableYoutubeNote(noteLike) || !isYoutubeVideoRelativePath(relativePath, input.subfolderLabel)) {
    return "internal";
  }

  if (playlistTitle && !isInternalPlaylistTitle(playlistTitle)) {
    return "playlistVideo";
  }

  return "standaloneVideo";
}

const NON_PLAYABLE_METADATA_FILENAMES = new Set([
  "readme.md",
  "playlist-summary.md",
  "channels.md",
  "concepts.md",
  "questions.md",
  "interests.md",
  "sources.md",
  "people-index.md",
  "concept-frequencies.md",
  "topic-graph.md",
  "playlist-timeline.md",
  "playlist-people-map.md",
  "playlist-concept-map.md",
  "playlist-learning-map.md",
]);

export function isLifeLabPlaylistIndex(input: LifeLabFileClassificationInput): boolean {
  return classifyLifeLabFile(input) === "playlist";
}
