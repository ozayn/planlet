import type {
  LifeLabNoteMetadata,
  LifeLabNoteSummary,
} from "@/lib/life-lab/constants";
import {
  relativePathFilename,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";
import { isPlaylistAssetRelativePath } from "@/lib/life-lab/playlist-asset-paths";
import {
  isPlayableYoutubeNote,
  playlistTitleKey,
} from "@/lib/life-lab/youtube-browse";

export const COLLECTION_EXCLUDED_FILENAMES = new Set([
  "readme.md",
  "index.md",
  "playlist-summary.md",
  "channels.md",
  "concepts.md",
  "questions.md",
  "sources.md",
  "interests.md",
]);

const COLLECTION_INDEX_FILENAME_PATTERNS = [
  /^index\.md$/i,
  /-index\.md$/i,
  /^playlist-index\.md$/i,
  /^collection-index\.md$/i,
] as const;

const INDEX_TITLE_SUFFIX = /\s+index\s*$/i;

export type CollectionPathSource =
  | "frontmatter-collectionPath"
  | "frontmatter-playlistPath"
  | "frontmatter-folderPath"
  | "frontmatter-collectionSlug"
  | "frontmatter-videosPath"
  | "frontmatter-assetPath"
  | "frontmatter-assetsPath"
  | "frontmatter-playlistAssetPath"
  | "same-folder"
  | "sibling-folder"
  | "playlist-metadata"
  | null;

export type CollectionCardDiagnostic = {
  indexFileId: string;
  indexRelativePath: string;
  resolvedFolderPath: string | null;
  resolutionSource: CollectionPathSource;
  recursiveFilesFound: number;
  excludedMetadataFiles: string[];
  finalContentNoteCount: number;
};

export type CollectionResolution = {
  indexNote: LifeLabNoteSummary;
  folderPath: string | null;
  resolved: boolean;
  resolutionSource: CollectionPathSource;
  contentNotes: LifeLabNoteSummary[];
  excludedRelativePaths: string[];
  diagnostic: CollectionCardDiagnostic;
};

const FRONTMATTER_FOLDER_FIELDS = [
  { field: "collectionPath", source: "frontmatter-collectionPath" },
  { field: "playlistPath", source: "frontmatter-playlistPath" },
  { field: "folderPath", source: "frontmatter-folderPath" },
  { field: "collectionSlug", source: "frontmatter-collectionSlug" },
  { field: "videosPath", source: "frontmatter-videosPath" },
  { field: "videos_path", source: "frontmatter-videosPath" },
  { field: "assetPath", source: "frontmatter-assetPath" },
  { field: "assetsPath", source: "frontmatter-assetsPath" },
  { field: "assets_path", source: "frontmatter-assetsPath" },
  { field: "playlistAssetPath", source: "frontmatter-playlistAssetPath" },
  { field: "playlist_asset_path", source: "frontmatter-playlistAssetPath" },
] as const;

export function isCollectionIndexFilename(filename: string): boolean {
  const lower = filename.toLowerCase();

  return COLLECTION_INDEX_FILENAME_PATTERNS.some((pattern) => pattern.test(lower));
}

export function isCollectionExcludedFilename(filename: string): boolean {
  const lower = filename.toLowerCase();

  if (COLLECTION_EXCLUDED_FILENAMES.has(lower)) {
    return true;
  }

  return isCollectionIndexFilename(lower);
}

export function stripIndexTitleSuffix(title: string): string {
  return title.replace(INDEX_TITLE_SUFFIX, "").trim();
}

export function formatCollectionDisplayTitle(input: {
  title?: string;
  metadata?: LifeLabNoteMetadata;
  content?: string;
}): string {
  const fromMetadata = input.metadata?.playlist?.trim();

  if (fromMetadata) {
    return fromMetadata;
  }

  const fromHeading = input.content
    ? titleFromMarkdownHeading(input.content)
    : null;

  if (fromHeading) {
    return stripIndexTitleSuffix(fromHeading);
  }

  const title = input.title?.trim() ?? "";

  return stripIndexTitleSuffix(title) || "Untitled collection";
}

export function normalizeCollectionSlug(value: string): string {
  let slug = value
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.endsWith("-index")) {
    slug = slug.slice(0, -"-index".length);
  }

  return slug;
}

function normalizeFolderPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return "";
  }

  const parts = normalized.split("/").filter(Boolean);

  if (parts.at(-1)?.toLowerCase().endsWith(".md")) {
    parts.pop();
  }

  return parts.join("/");
}

function parentFolderPath(relativePath: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  parts.pop();

  return parts.join("/");
}

export function collectionSlugFromIndexNote(
  indexNote: Pick<LifeLabNoteSummary, "relativePath">,
): string {
  const filename = relativePathFilename(indexNote.relativePath);
  const stem = filename.replace(/\.md$/i, "");
  const lowerStem = stem.toLowerCase();

  if (lowerStem.endsWith("-index")) {
    return stem.slice(0, -"-index".length);
  }

  if (
    lowerStem === "index" ||
    lowerStem === "playlist-index" ||
    lowerStem === "collection-index"
  ) {
    const parent = parentFolderPath(indexNote.relativePath);

    if (parent) {
      return parent.split("/").pop() ?? parent;
    }
  }

  return stem;
}

function folderPathFromFrontmatter(
  metadata?: LifeLabNoteMetadata,
): { path: string; source: CollectionPathSource } | null {
  if (!metadata) {
    return null;
  }

  for (const entry of FRONTMATTER_FOLDER_FIELDS) {
    const rawValue = metadata[entry.field as keyof LifeLabNoteMetadata];

    if (typeof rawValue !== "string" || !rawValue.trim()) {
      continue;
    }

    const path = normalizeFolderPath(rawValue);

    if (path) {
      return { path, source: entry.source };
    }
  }

  return null;
}

export function buildCollectionFolderCandidates(
  indexNote: LifeLabNoteSummary,
): Array<{ path: string; source: CollectionPathSource }> {
  const candidates: Array<{ path: string; source: CollectionPathSource }> = [];
  const seen = new Set<string>();

  function add(path: string, source: CollectionPathSource): void {
    const normalized = normalizeFolderPath(path);

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidates.push({ path: normalized, source });
  }

  const frontmatter = folderPathFromFrontmatter(indexNote.metadata);

  if (frontmatter) {
    add(frontmatter.path, frontmatter.source);
  }

  const slug = normalizeCollectionSlug(collectionSlugFromIndexNote(indexNote));
  const parentPath = parentFolderPath(indexNote.relativePath);

  if (parentPath) {
    add(parentPath, "same-folder");
    add(`${parentPath}/${slug}`, "sibling-folder");
  }

  add(slug, "sibling-folder");

  if (
    indexNote.subfolderLabel === "playlists" ||
    indexNote.relativePath.startsWith("playlists/")
  ) {
    add(`playlists/${slug}`, "sibling-folder");
  }

  const playlist = indexNote.metadata?.playlist?.trim();

  if (playlist) {
    const playlistSlug = normalizeCollectionSlug(playlist);
    add(playlistSlug, "sibling-folder");
    add(`playlists/${playlistSlug}`, "sibling-folder");
  }

  return candidates;
}

export function isNoteUnderFolderPath(
  noteRelativePath: string,
  folderPath: string,
): boolean {
  const normalizedFolder = normalizeFolderPath(folderPath);
  const normalizedNote = noteRelativePath.replace(/\\/g, "/");

  if (!normalizedFolder) {
    return false;
  }

  return (
    normalizedNote === normalizedFolder ||
    normalizedNote.startsWith(`${normalizedFolder}/`)
  );
}

export function isCollectionContentNote(
  note: LifeLabNoteSummary,
  indexNote: LifeLabNoteSummary,
): boolean {
  if (note.slug === indexNote.slug || note.fileId === indexNote.fileId) {
    return false;
  }

  if (!note.relativePath.toLowerCase().endsWith(".md")) {
    return false;
  }

  const filename = relativePathFilename(note.relativePath);

  if (isCollectionExcludedFilename(filename)) {
    return false;
  }

  if (isPlaylistAssetRelativePath(note.relativePath)) {
    return false;
  }

  if (isCollectionIndexFilename(filename)) {
    return false;
  }

  if (note.metadata?.type === "playlist-index") {
    return false;
  }

  const relativePath = note.relativePath.toLowerCase();

  if (
    relativePath.startsWith("archive/") ||
    note.subfolderLabel?.toLowerCase() === "archive"
  ) {
    return false;
  }

  return true;
}

function listNotesUnderFolder(
  indexNote: LifeLabNoteSummary,
  allNotes: LifeLabNoteSummary[],
  folderPath: string,
): {
  contentNotes: LifeLabNoteSummary[];
  excludedRelativePaths: string[];
} {
  const contentNotes: LifeLabNoteSummary[] = [];
  const excludedRelativePaths: string[] = [];

  for (const note of allNotes) {
    if (!isNoteUnderFolderPath(note.relativePath, folderPath)) {
      continue;
    }

    if (isCollectionContentNote(note, indexNote)) {
      contentNotes.push(note);
      continue;
    }

    excludedRelativePaths.push(note.relativePath);
  }

  return { contentNotes, excludedRelativePaths };
}

function listNotesByPlaylistMetadata(
  indexNote: LifeLabNoteSummary,
  allNotes: LifeLabNoteSummary[],
  playlistTitle: string,
): LifeLabNoteSummary[] {
  const key = playlistTitleKey(playlistTitle);

  return allNotes.filter((note) => {
    if (!isCollectionContentNote(note, indexNote)) {
      return false;
    }

    const playlist = note.metadata?.playlist?.trim();

    if (playlist && playlistTitleKey(playlist) === key) {
      return true;
    }

    return isPlayableYoutubeNote(note) && playlistTitleKey(playlist ?? "") === key;
  });
}

function buildDiagnostic(
  indexNote: LifeLabNoteSummary,
  folderPath: string | null,
  resolutionSource: CollectionPathSource,
  contentNotes: LifeLabNoteSummary[],
  excludedRelativePaths: string[],
): CollectionCardDiagnostic {
  return {
    indexFileId: indexNote.fileId,
    indexRelativePath: indexNote.relativePath,
    resolvedFolderPath: folderPath,
    resolutionSource,
    recursiveFilesFound: contentNotes.length,
    excludedMetadataFiles: excludedRelativePaths,
    finalContentNoteCount: contentNotes.length,
  };
}

export function resolveCollection(
  indexNote: LifeLabNoteSummary,
  allNotes: LifeLabNoteSummary[],
): CollectionResolution {
  for (const candidate of buildCollectionFolderCandidates(indexNote)) {
    const { contentNotes, excludedRelativePaths } = listNotesUnderFolder(
      indexNote,
      allNotes,
      candidate.path,
    );

    if (contentNotes.length > 0) {
      return {
        indexNote,
        folderPath: candidate.path,
        resolved: true,
        resolutionSource: candidate.source,
        contentNotes,
        excludedRelativePaths,
        diagnostic: buildDiagnostic(
          indexNote,
          candidate.path,
          candidate.source,
          contentNotes,
          excludedRelativePaths,
        ),
      };
    }
  }

  const playlistTitle = formatCollectionDisplayTitle({
    title: indexNote.title,
    metadata: indexNote.metadata,
  });
  const metadataMatches = listNotesByPlaylistMetadata(
    indexNote,
    allNotes,
    playlistTitle,
  );

  if (metadataMatches.length > 0) {
    return {
      indexNote,
      folderPath: null,
      resolved: true,
      resolutionSource: "playlist-metadata",
      contentNotes: metadataMatches,
      excludedRelativePaths: [],
      diagnostic: buildDiagnostic(
        indexNote,
        null,
        "playlist-metadata",
        metadataMatches,
        [],
      ),
    };
  }

  return {
    indexNote,
    folderPath: null,
    resolved: false,
    resolutionSource: null,
    contentNotes: [],
    excludedRelativePaths: [],
    diagnostic: buildDiagnostic(indexNote, null, null, [], []),
  };
}

export function listCollectionContentNotes(
  indexNote: LifeLabNoteSummary,
  allNotes: LifeLabNoteSummary[],
): LifeLabNoteSummary[] {
  return resolveCollection(indexNote, allNotes).contentNotes;
}

export function getCollectionNoteCount(
  indexNote: LifeLabNoteSummary,
  allNotes: LifeLabNoteSummary[],
): number {
  return listCollectionContentNotes(indexNote, allNotes).length;
}
