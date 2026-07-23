import { revalidatePath, unstable_cache } from "next/cache";

import { extractTechnicalProvenanceForDebug } from "@/lib/life-lab/markdown-display";

import {
  getLifeLabListCacheSeconds,
  getLifeLabNoteCacheSeconds,
  lifeLabFolderMapCacheKey,
  lifeLabNoteCacheTag,
  lifeLabListingMetadataCacheKey,
  lifeLabNotePayloadCacheKey,
  lifeLabPlaylistAssetsBundleCacheKey,
  lifeLabPlaylistAssetCacheTag,
  lifeLabPlaylistAssetsCacheTag,
  lifeLabPlaylistClustersCacheTag,
  lifeLabPlaylistFullMapCacheTag,
  lifeLabPlaylistLearningMapCacheTag,
  lifeLabPlaylistCacheTag,
  lifeLabSectionCacheTag,
  lifeLabSectionFileIndexCacheKey,
  lifeLabFlashcardSummaryCacheKey,
  LIFE_LAB_CACHE_TAG,
  LIFE_LAB_FOLDER_MAP_CACHE_VERSION,
  LIFE_LAB_SECTIONS_CACHE_TAG,
  LIFE_LAB_SECTION_FILE_INDEX_CACHE_VERSION,
  LIFE_LAB_NOTE_PAYLOAD_CACHE_VERSION,
  LIFE_LAB_LISTING_METADATA_CACHE_VERSION,
  lifeLabSectionPlaylistsCacheTag,
} from "@/lib/life-lab/cache";
import {
  invalidateLifeLabNoteCaches,
  invalidateLifeLabPlaylistAssetCache,
  invalidateLifeLabPlaylistAssetsCache,
  invalidateLifeLabPlaylistLearningMapCache,
  invalidateLifeLabPlaylistCache,
  invalidateLifeLabSectionCache,
  invalidateLifeLabSectionsCache,
} from "@/lib/life-lab/cache-invalidation";
import {
  beginLifeLabCacheMiss,
  buildLifeLabCacheDiagnostic,
  finishLifeLabCacheLookup,
  getLifeLabCacheResult,
  logLifeLabPlaylistCacheSummary,
  runLifeLabRequestTelemetry,
  setLifeLabRequestMeta,
} from "@/lib/life-lab/cache-telemetry";
import {
  LIFE_LAB_CACHE_SECONDS,
  LIFE_LAB_UNAVAILABLE_MESSAGE,
  LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE,
  type LifeLabAvailability,
  type LifeLabDiagnostic,
  type LifeLabListingDiagnostic,
  type LifeLabNote,
  type LifeLabNoteDevMeta,
  type LifeLabNoteGroup,
  type LifeLabNoteSummary,
  type LifeLabSectionId,
  type LifeLabSectionSummary,
  type LifeLabStudyCard,
  type LifeLabBrowseNote,
  type LifeLabCacheDiagnostic,
} from "@/lib/life-lab/constants";
import {
  processLifeLabNoteContent,
  type LifeLabSectionNoteRecord,
} from "@/lib/life-lab/enrichment";
import { collectLifeLabFilterOptions, type LifeLabFilterOptions, type LifeLabNoteFilters, filterLifeLabNotes } from "@/lib/life-lab/filters";
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
import {
  extractLifeLabListingMetadata,
  hasListingThumbnailInputs,
  listingFieldsFromVideoUrl,
  mergeListingMetadata,
  type LifeLabListingMetadata,
} from "@/lib/life-lab/listing-metadata";
import { isPlaylistAssetRelativePath } from "@/lib/life-lab/playlist-asset-paths";
import {
  resolveLifeLabSourceUrl,
  stripSourceUrlLineFromMarkdown,
} from "@/lib/life-lab/source-url";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import {
  downloadDriveFile,
  downloadDriveFileBytes,
  findDriveFileByRelativePath,
  getLifeLabDriveCredentials,
  isFlashcardDeckDriveFile,
  LifeLabDriveError,
  listDriveChildren,
  listMarkdownFilesRecursive,
  type DriveCredentials,
  type DriveListingStats,
  type DriveMarkdownEntry,
} from "@/lib/life-lab/google-drive";
import {
  isFilmLabExcludedFolder,
  isFilmLabExcludedRelativePath,
} from "@/lib/life-lab/film-lab";
import {
  isLectureNotesBlockedRelativePath,
  shouldIncludeLectureNoteInPlanlet,
} from "@/lib/life-lab/lecture-notes";
import {
  isPodcastBlockedFolder,
  isPodcastVisibleMarkdown,
} from "@/lib/life-lab/podcasts";
import {
  isFlashcardBlockedFolder,
  isFlashcardVisibleRelativePath,
  buildFlashcardDeckFromContent,
  buildEmbeddedFlashcardDeck,
  type FlashcardDeckSummary,
} from "@/lib/life-lab/flashcard-decks";
import {
  EMPTY_LIFE_LAB_FLASHCARD_SUMMARY,
  summarizeFlashcardDecks,
  type LifeLabFlashcardSummary,
} from "@/lib/life-lab/flashcard-summary";
import { resolveFlashcardDeckPathFromMetadata } from "@/lib/life-lab/flashcards";
import {
  classifyNoteGroup,
  groupLifeLabNotes,
  noteAssignmentPriority,
} from "@/lib/life-lab/organization";
import { diagnoseYoutubePlaylistBrowse } from "@/lib/life-lab/section-view";
import {
  getAllowedLifeLabSectionIds,
  getLifeLabSectionLabel,
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
  sectionIdFromFolderName,
} from "@/lib/life-lab/sections";
import {
  driveRelativePathToSlug,
  formatDateLabelFromFilename,
  markdownExcerpt,
  relativePathFilename,
  relativePathSubfolder,
  titleFromFilename,
} from "@/lib/life-lab/slug";
import {
  buildPlaylistNavigationFromVideoNotes,
  buildVideoPlaylistNavigation,
  findPlaylistIndexSlugByMetadata,
  isPlaylistIndexNote,
  isYoutubeVideoNote,
  parsePlaylistIndexNote,
  resolveYoutubeVideoPlaylistNavigation,
  type PlaylistVideoNavigation,
} from "@/lib/life-lab/playlist-index";
import { cache } from "react";
import {
  buildPlaylistAssetsBundle,
  buildPlaylistClusterFile,
  emptyPlaylistAssetDiagnostics,
  emptyPlaylistAssetsBundle,
  orderPlaylistAssetsForDisplay,
  parseClusterRowsFromLoadedAssets,
  PLAYLIST_ASSET_IDS,
  playlistAssetsCacheKeyParts,
  preparePlaylistAssetMarkdown,
  resolvePlaylistAssetsForIndexNote,
  resolvePlaylistClusterRecords,
  suppressDuplicatePlaylistIndexContent,
  type PlaylistAssetsBundle,
} from "@/lib/life-lab/playlist-assets";
import { canAccessLifeLabPage, type UserAccess } from "@/lib/roles";

export {
  LIFE_LAB_ALLOWED_SECTIONS,
  LIFE_LAB_BLOCKED_SECTION_IDS,
  LIFE_LAB_CACHE_SECONDS,
  LIFE_LAB_CACHE_TAG,
  LIFE_LAB_DRIVE_READONLY_SCOPE,
  LIFE_LAB_UNAVAILABLE_MESSAGE,
  LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE,
} from "@/lib/life-lab/constants";

export type {
  LifeLabAvailability,
  LifeLabDiagnostic,
  LifeLabListingDiagnostic,
  LifeLabNote,
  LifeLabNoteDevMeta,
  LifeLabNoteGroup,
  LifeLabNoteSummary,
  LifeLabSectionId,
  LifeLabSectionSummary,
  LifeLabStudyCard,
  LifeLabFlashcard,
  LifeLabNoteMetadata,
  LifeLabBrowseNote,
} from "@/lib/life-lab/constants";

export type { PlaylistVideoNavigation } from "@/lib/life-lab/playlist-index";
export { collectLifeLabFilterOptions, filterLifeLabNotes, noteMatchesFilters } from "@/lib/life-lab/filters";
export { noteMatchesSearch, buildNoteSearchText } from "@/lib/life-lab/search";
export { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
export { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";

export {
  getAllowedLifeLabSectionIds,
  getLifeLabSectionLabel,
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
} from "@/lib/life-lab/sections";

export class LifeLabError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifeLabError";
  }
}

export function requireLifeLabUser(access: UserAccess): void {
  if (!canAccessLifeLabPage(access)) {
    throw new LifeLabError("Not authorized.");
  }
}

type LifeLabFolderMapEntries = Array<[LifeLabSectionId, string]>;

type LifeLabFolderMapError = {
  name: string;
  message: string;
};

export type LifeLabFolderMapResult =
  | { ok: true; entries: LifeLabFolderMapEntries }
  | { ok: false; error: LifeLabFolderMapError };

type LifeLabNotePayload = {
  record: LifeLabSectionNoteRecord;
  rawContent: string;
};

type LifeLabSectionFileIndex = {
  records: LifeLabSectionNoteRecord[];
  listingDiagnostic: LifeLabListingDiagnostic;
};

export function lifeLabFolderEntriesToMap(
  entries: LifeLabFolderMapEntries,
): Map<LifeLabSectionId, string> {
  return new Map(entries);
}

function serializeLifeLabError(error: Error): LifeLabFolderMapError {
  return {
    name: error.name,
    message: error.message,
  };
}

function logLifeLabFolderMapFailure(error: Error): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[life-lab] failed to load folder map", error);
  }
}

function buildLifeLabDiagnostic(
  options: {
    folderMapLoaded?: boolean;
    error?: Error | LifeLabFolderMapError;
  } = {},
): LifeLabDiagnostic {
  const credentials = getLifeLabDriveCredentials();

  return {
    driveCredentialsPresent: credentials !== null,
    rootFolderIdPresent: Boolean(process.env.LIFE_LAB_DRIVE_FOLDER_ID?.trim()),
    folderMapLoaded: options.folderMapLoaded ?? false,
    errorName: options.error?.name,
    errorMessage: options.error?.message,
  };
}

function unavailableAvailability(
  error?: Error | LifeLabFolderMapError,
  folderMapLoaded = false,
): LifeLabAvailability {
  return {
    status: "unavailable",
    message: LIFE_LAB_UNAVAILABLE_MESSAGE,
    diagnostic: buildLifeLabDiagnostic({ error, folderMapLoaded }),
  };
}

export function normalizeLifeLabFolderMapResult(
  value: unknown,
): LifeLabFolderMapResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("ok" in value && value.ok === true && "entries" in value) {
    const entries = value.entries;

    if (!Array.isArray(entries)) {
      return null;
    }

    return {
      ok: true,
      entries: entries as LifeLabFolderMapEntries,
    };
  }

  if (
    "ok" in value &&
    value.ok === false &&
    "error" in value &&
    value.error &&
    typeof value.error === "object" &&
    "message" in value.error
  ) {
    const error = value.error as LifeLabFolderMapError;

    return {
      ok: false,
      error: {
        name: typeof error.name === "string" ? error.name : "Error",
        message:
          typeof error.message === "string"
            ? error.message
            : "Failed to load Life Lab folder map.",
      },
    };
  }

  return null;
}

export function resolveLifeLabFolderMap(
  result: LifeLabFolderMapResult | null | undefined,
): Map<LifeLabSectionId, string> | null {
  if (!result?.ok || !Array.isArray(result.entries)) {
    return null;
  }

  return lifeLabFolderEntriesToMap(result.entries);
}

export function getLifeLabAvailability(): LifeLabAvailability {
  const credentials = getLifeLabDriveCredentials();

  if (!credentials) {
    return {
      status: "unconfigured",
      adminMessage: LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE,
      diagnostic: buildLifeLabDiagnostic(),
    };
  }

  return { status: "ready" };
}

async function loadSectionFolderMap(): Promise<LifeLabFolderMapResult> {
  try {
    const credentials = getLifeLabDriveCredentials();

    if (!credentials) {
      const error = new LifeLabDriveError(
        "Life Lab Drive credentials are missing.",
      );
      logLifeLabFolderMapFailure(error);

      return {
        ok: false,
        error: serializeLifeLabError(error),
      };
    }

    const folderMap = await listSectionFolders(credentials);

    return {
      ok: true,
      entries: [...folderMap.entries()],
    };
  } catch (error) {
    const normalized =
      error instanceof Error
        ? error
        : new LifeLabDriveError("Failed to load Life Lab folder map.");
    logLifeLabFolderMapFailure(normalized);

    return {
      ok: false,
      error: serializeLifeLabError(normalized),
    };
  }
}

function formatModifiedLabel(modifiedTime: string | null | undefined): string | null {
  if (!modifiedTime) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(modifiedTime));
}

function driveFileSizeBytes(size: string | undefined): number | null {
  if (!size) {
    return null;
  }

  const parsed = Number.parseInt(size, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function parentFolderFromRelativePath(relativePath: string): string | null {
  const parts = relativePath.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return "(section root)";
  }

  return parts.slice(0, -1).join("/");
}

function toNoteDevMeta(record: LifeLabSectionNoteRecord): LifeLabNoteDevMeta {
  const filename = relativePathFilename(record.relativePath);

  return {
    fileId: record.fileId,
    relativePath: record.relativePath,
    filename,
    parentFolder: parentFolderFromRelativePath(record.relativePath),
    mimeType: record.mimeType,
    modifiedAt: record.modifiedAt,
    fileSizeBytes: record.fileSizeBytes,
  };
}

function summarizeMarkdownEntry(
  entry: DriveMarkdownEntry,
  content?: string,
): LifeLabSectionNoteRecord {
  const { file, relativePath } = entry;
  const slug = driveRelativePathToSlug(relativePath);
  const filename = relativePathFilename(relativePath);
  const excerptSource = content ?? "";
  const modifiedAt = file.modifiedTime ?? null;

  return {
    slug,
    title: titleFromFilename(filename),
    excerpt: excerptSource ? markdownExcerpt(excerptSource) : "",
    modifiedAt,
    modifiedAtLabel: formatModifiedLabel(modifiedAt),
    dateLabel: formatDateLabelFromFilename(filename),
    subfolderLabel: relativePathSubfolder(relativePath),
    fileId: file.id,
    relativePath,
    mimeType: file.mimeType ?? null,
    fileSizeBytes: driveFileSizeBytes(file.size),
  };
}

function dedupeSectionNoteRecords(
  records: LifeLabSectionNoteRecord[],
): LifeLabSectionNoteRecord[] {
  const sorted = [...records].sort((left, right) => {
    const leftPriority = noteAssignmentPriority(
      classifyNoteGroupFromRecord(left),
    );
    const rightPriority = noteAssignmentPriority(
      classifyNoteGroupFromRecord(right),
    );

    return leftPriority - rightPriority;
  });
  const byRelativePath = new Map<string, LifeLabSectionNoteRecord>();
  const byFileId = new Map<string, LifeLabSectionNoteRecord>();

  for (const record of sorted) {
    if (byFileId.has(record.fileId) || byRelativePath.has(record.relativePath)) {
      continue;
    }

    byFileId.set(record.fileId, record);
    byRelativePath.set(record.relativePath, record);
  }

  return [...byRelativePath.values()];
}

function classifyNoteGroupFromRecord(
  record: LifeLabSectionNoteRecord,
): string {
  return classifyNoteGroup({
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    modifiedAt: record.modifiedAt,
    modifiedAtLabel: record.modifiedAtLabel,
    dateLabel: record.dateLabel,
    subfolderLabel: record.subfolderLabel,
    fileId: record.fileId,
    relativePath: record.relativePath,
  });
}

function toNoteSummary(record: LifeLabSectionNoteRecord): LifeLabNoteSummary {
  const summary: LifeLabNoteSummary = {
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    modifiedAt: record.modifiedAt,
    modifiedAtLabel: record.modifiedAtLabel,
    dateLabel: record.dateLabel,
    subfolderLabel: record.subfolderLabel,
    fileId: record.fileId,
    relativePath: record.relativePath,
    metadata: record.metadata,
    searchText: record.searchText,
    podcastIndexContent: record.podcastIndexContent,
    hasFlashcards: record.hasFlashcards,
    flashcardCount: record.flashcardCount,
  };

  if (isLifeLabDevToolsEnabled()) {
    summary.dev = toNoteDevMeta(record);
  }

  return summary;
}

function toListingDiagnostic(stats: DriveListingStats): LifeLabListingDiagnostic {
  return {
    fileCount: stats.fileCount,
    foldersTraversed: stats.foldersTraversed,
    maxDepthUsed: stats.maxDepthUsed,
    paginationOccurred: stats.paginationOccurred,
  };
}

async function listSectionFolders(
  credentials: DriveCredentials,
): Promise<Map<LifeLabSectionId, string>> {
  const { files: children } = await listDriveChildren(
    credentials,
    credentials.rootFolderId,
  );
  const folders = new Map<LifeLabSectionId, string>();

  for (const item of children) {
    if (item.mimeType !== "application/vnd.google-apps.folder") {
      continue;
    }

    const sectionId = sectionIdFromFolderName(item.name);
    if (!sectionId) {
      continue;
    }

    folders.set(sectionId, item.id);
  }

  return folders;
}

async function listSectionMarkdownFiles(
  credentials: DriveCredentials,
  folderId: string,
  sectionId?: LifeLabSectionId,
) {
  return listMarkdownFilesRecursive(credentials, folderId, {
    maxDepth:
      sectionId === "podcasts" || sectionId === "flashcards" ? 10 : undefined,
    isFileIncluded:
      sectionId === "flashcards" ? isFlashcardDeckDriveFile : undefined,
    shouldSkipFolder:
      sectionId === "film-lab"
        ? (folderName, prefix) => isFilmLabExcludedFolder(folderName, prefix)
        : sectionId === "lecture-notes"
          ? (folderName, prefix) => {
              const nextPrefix = prefix ? `${prefix}/${folderName}` : folderName;
              return isLectureNotesBlockedRelativePath(nextPrefix);
            }
          : sectionId === "podcasts"
            ? (folderName, prefix) =>
                isPodcastBlockedFolder(folderName, prefix)
            : sectionId === "flashcards"
              ? (folderName) => isFlashcardBlockedFolder(folderName)
          : undefined,
  });
}

function filterSectionMarkdownEntries(
  entries: DriveMarkdownEntry[],
  sectionId: LifeLabSectionId,
): DriveMarkdownEntry[] {
  if (sectionId === "film-lab") {
    return entries.filter(
      (entry) => !isFilmLabExcludedRelativePath(entry.relativePath),
    );
  }

  if (sectionId === "lecture-notes") {
    return entries.filter(
      (entry) => !isLectureNotesBlockedRelativePath(entry.relativePath),
    );
  }

  if (sectionId === "podcasts") {
    return entries.filter((entry) =>
      isPodcastVisibleMarkdown(entry.relativePath),
    );
  }

  if (sectionId === "flashcards") {
    return entries.filter((entry) =>
      isFlashcardVisibleRelativePath(entry.relativePath),
    );
  }

  return entries;
}

function filterEnrichedSectionRecords(
  sectionId: LifeLabSectionId,
  records: LifeLabSectionNoteRecord[],
): LifeLabSectionNoteRecord[] {
  if (sectionId !== "lecture-notes") {
    return records;
  }

  return records.filter((record) =>
    shouldIncludeLectureNoteInPlanlet({
      sectionId,
      relativePath: record.relativePath,
      metadata: record.metadata,
    }),
  );
}

async function getSectionFolderMapCached(): Promise<LifeLabFolderMapResult> {
  const cacheKey = lifeLabFolderMapCacheKey();
  const startedAt = Date.now();

  const result = await unstable_cache(
    async () => {
      beginLifeLabCacheMiss({
        type: "folder-map",
        key: cacheKey,
        tags: [LIFE_LAB_SECTIONS_CACHE_TAG, LIFE_LAB_CACHE_TAG],
      });
      return loadSectionFolderMap();
    },
    ["life-lab-section-folder-map", LIFE_LAB_FOLDER_MAP_CACHE_VERSION],
    {
      revalidate: getLifeLabListCacheSeconds(),
      tags: [LIFE_LAB_SECTIONS_CACHE_TAG, LIFE_LAB_CACHE_TAG],
    },
  )();

  finishLifeLabCacheLookup({
    type: "folder-map",
    key: cacheKey,
    durationMs: Date.now() - startedAt,
    tags: [LIFE_LAB_SECTIONS_CACHE_TAG, LIFE_LAB_CACHE_TAG],
  });

  return result;
}

async function getSectionFolderMap(): Promise<LifeLabFolderMapResult> {
  const cached = normalizeLifeLabFolderMapResult(await getSectionFolderMapCached());

  if (cached) {
    return cached;
  }

  const error = new LifeLabDriveError(
    "Life Lab folder map cache returned an invalid result.",
  );
  logLifeLabFolderMapFailure(error);

  return {
    ok: false,
    error: serializeLifeLabError(error),
  };
}

async function loadSectionFileIndex(
  sectionId: LifeLabSectionId,
  options: { useCachedFolderMap?: boolean } = {},
): Promise<LifeLabSectionFileIndex> {
  const emptyDiagnostic: LifeLabListingDiagnostic = {
    fileCount: 0,
    foldersTraversed: 0,
    maxDepthUsed: 0,
    paginationOccurred: false,
  };

  const mapResult = options.useCachedFolderMap === false
    ? await loadSectionFolderMap()
    : await getSectionFolderMap();

  if (!mapResult.ok) {
    return {
      records: [],
      listingDiagnostic: emptyDiagnostic,
    };
  }

  const credentials = getLifeLabDriveCredentials();
  if (!credentials) {
    return {
      records: [],
      listingDiagnostic: emptyDiagnostic,
    };
  }

  const folderMap = resolveLifeLabFolderMap(mapResult);
  const folderId = folderMap?.get(sectionId);

  if (!folderId) {
    return {
      records: [],
      listingDiagnostic: emptyDiagnostic,
    };
  }

  const { entries, stats } = await listSectionMarkdownFiles(
    credentials,
    folderId,
    sectionId,
  );
  const visibleEntries = filterSectionMarkdownEntries(entries, sectionId);
  let records = dedupeSectionNoteRecords(
    visibleEntries.map((entry) => summarizeMarkdownEntry(entry)),
  );

  // YouTube browse cards need source/thumbnail fields on the lightweight index
  // itself so a warm section-index hit can render thumbs with ~0 Drive calls.
  if (sectionId === "youtube-learning") {
    records = await attachListingMetadataInline(credentials, records);
  }

  return {
    records,
    listingDiagnostic: toListingDiagnostic(stats),
  };
}

async function attachListingMetadataInline(
  credentials: DriveCredentials,
  baseRecords: LifeLabSectionNoteRecord[],
): Promise<LifeLabSectionNoteRecord[]> {
  return Promise.all(
    baseRecords.map(async (baseRecord) => {
      if (isPlaylistAssetRelativePath(baseRecord.relativePath)) {
        return baseRecord;
      }

      if (hasListingThumbnailInputs(baseRecord.metadata)) {
        return baseRecord;
      }

      try {
        const rawContent = await downloadDriveFile(
          credentials,
          baseRecord.fileId,
        );
        const listing = extractLifeLabListingMetadata(rawContent);

        return {
          ...baseRecord,
          metadata: mergeListingMetadata(baseRecord.metadata, listing),
        };
      } catch {
        return baseRecord;
      }
    }),
  );
}

async function getSectionFileIndexCached(
  sectionId: LifeLabSectionId,
): Promise<LifeLabSectionFileIndex> {
  const cacheKey = lifeLabSectionFileIndexCacheKey(sectionId);
  const tags = [
    LIFE_LAB_SECTIONS_CACHE_TAG,
    lifeLabSectionCacheTag(sectionId),
    lifeLabSectionPlaylistsCacheTag(sectionId),
    LIFE_LAB_CACHE_TAG,
  ];
  const startedAt = Date.now();

  const result = await unstable_cache(
    async () => {
      beginLifeLabCacheMiss({
        type: "section",
        key: cacheKey,
        tags,
      });
      return loadSectionFileIndex(sectionId);
    },
    [
      "life-lab-section-file-index",
      LIFE_LAB_SECTION_FILE_INDEX_CACHE_VERSION,
      sectionId,
    ],
    {
      revalidate: getLifeLabListCacheSeconds(),
      tags,
    },
  )();

  finishLifeLabCacheLookup({
    type: "section",
    key: cacheKey,
    durationMs: Date.now() - startedAt,
    tags,
  });

  return result;
}

async function loadNotePayload(
  sectionId: LifeLabSectionId,
  baseRecord: LifeLabSectionNoteRecord,
): Promise<LifeLabNotePayload | null> {
  const credentials = getLifeLabDriveCredentials();
  if (!credentials) {
    return null;
  }

  const rawContent = await downloadDriveFile(credentials, baseRecord.fileId);

  return {
    record: processLifeLabNoteContent(
      {
        ...baseRecord,
        sectionId,
      },
      rawContent,
    ),
    rawContent,
  };
}

async function getNotePayloadCached(
  sectionId: LifeLabSectionId,
  baseRecord: LifeLabSectionNoteRecord,
): Promise<LifeLabNotePayload | null> {
  const cacheKey = lifeLabNotePayloadCacheKey(baseRecord.fileId);
  const tags = [
    lifeLabNoteCacheTag(baseRecord.fileId),
    lifeLabSectionCacheTag(sectionId),
    LIFE_LAB_CACHE_TAG,
  ];
  const startedAt = Date.now();

  const result = await unstable_cache(
    async () => {
      beginLifeLabCacheMiss({
        type: "note",
        key: cacheKey,
        tags,
      });
      return loadNotePayload(sectionId, baseRecord);
    },
    ["life-lab-note-payload", LIFE_LAB_NOTE_PAYLOAD_CACHE_VERSION, baseRecord.fileId],
    {
      revalidate: getLifeLabNoteCacheSeconds(),
      tags,
    },
  )();

  finishLifeLabCacheLookup({
    type: "note",
    key: cacheKey,
    durationMs: Date.now() - startedAt,
    tags,
  });

  return result;
}

async function enrichSectionRecordsFromCache(
  sectionId: LifeLabSectionId,
  baseRecords: LifeLabSectionNoteRecord[],
): Promise<LifeLabSectionNoteRecord[]> {
  const enriched = await Promise.all(
    baseRecords.map(async (baseRecord) => {
      const payload = await getNotePayloadCached(sectionId, baseRecord);

      return payload?.record ?? baseRecord;
    }),
  );

  return enriched;
}

async function enrichPlaylistIndexRecordsForBrowse(
  sectionId: LifeLabSectionId,
  baseRecords: LifeLabSectionNoteRecord[],
): Promise<{
  records: LifeLabSectionNoteRecord[];
  indexBodies: Map<string, string>;
}> {
  const indexBodies = new Map<string, string>();
  const enrichedByFileId = new Map<string, LifeLabSectionNoteRecord>();

  await Promise.all(
    baseRecords.map(async (baseRecord) => {
      if (
        !isPlaylistIndexNote({
          sectionId,
          relativePath: baseRecord.relativePath,
          subfolderLabel: baseRecord.subfolderLabel,
          metadata: baseRecord.metadata,
        })
      ) {
        return;
      }

      const payload = await getNotePayloadCached(sectionId, baseRecord);

      if (!payload) {
        return;
      }

      enrichedByFileId.set(baseRecord.fileId, payload.record);
      const { body } = parseLifeLabFrontmatter(payload.rawContent);
      indexBodies.set(baseRecord.fileId, body);
    }),
  );

  return {
    records: baseRecords.map(
      (record) => enrichedByFileId.get(record.fileId) ?? record,
    ),
    indexBodies,
  };
}

async function loadListingMetadata(
  baseRecord: LifeLabSectionNoteRecord,
): Promise<LifeLabListingMetadata | null> {
  const credentials = getLifeLabDriveCredentials();

  if (!credentials) {
    return null;
  }

  const rawContent = await downloadDriveFile(credentials, baseRecord.fileId);

  return extractLifeLabListingMetadata(rawContent);
}

async function getListingMetadataCached(
  sectionId: LifeLabSectionId,
  baseRecord: LifeLabSectionNoteRecord,
): Promise<LifeLabListingMetadata | null> {
  const cacheKey = lifeLabListingMetadataCacheKey(baseRecord.fileId);
  const tags = [
    lifeLabNoteCacheTag(baseRecord.fileId),
    lifeLabSectionCacheTag(sectionId),
    LIFE_LAB_CACHE_TAG,
  ];
  const startedAt = Date.now();

  const result = await unstable_cache(
    async () => {
      beginLifeLabCacheMiss({
        type: "note",
        key: cacheKey,
        tags,
      });
      return loadListingMetadata(baseRecord);
    },
    [
      "life-lab-listing-metadata",
      LIFE_LAB_LISTING_METADATA_CACHE_VERSION,
      baseRecord.fileId,
    ],
    {
      revalidate: getLifeLabNoteCacheSeconds(),
      tags,
    },
  )();

  finishLifeLabCacheLookup({
    type: "note",
    key: cacheKey,
    durationMs: Date.now() - startedAt,
    tags,
  });

  return result;
}

/**
 * Attaches slim thumbnail/source metadata for browse cards without full
 * note enrichment. Listing fields are extracted once and cached per file.
 * Prefer metadata already stored on the lightweight section index.
 */
async function attachListingMetadataToBrowseRecords(
  sectionId: LifeLabSectionId,
  baseRecords: LifeLabSectionNoteRecord[],
): Promise<LifeLabSectionNoteRecord[]> {
  return Promise.all(
    baseRecords.map(async (baseRecord) => {
      if (isPlaylistAssetRelativePath(baseRecord.relativePath)) {
        return baseRecord;
      }

      if (hasListingThumbnailInputs(baseRecord.metadata)) {
        return baseRecord;
      }

      const listing = await getListingMetadataCached(sectionId, baseRecord);

      if (!listing) {
        return baseRecord;
      }

      return {
        ...baseRecord,
        metadata: mergeListingMetadata(baseRecord.metadata, listing),
      };
    }),
  );
}

/**
 * Fill missing video note thumbnail inputs from playlist index tables so
 * playlist cards can use first-child thumbs without fetching child bodies.
 */
function hydrateListingMetadataFromPlaylistIndexes(
  sectionId: LifeLabSectionId,
  records: LifeLabSectionNoteRecord[],
  indexBodies: Map<string, string>,
): LifeLabSectionNoteRecord[] {
  const bySlug = new Map(records.map((record) => [record.slug, record]));
  const updates = new Map<string, LifeLabSectionNoteRecord>();

  for (const [fileId, body] of indexBodies) {
    const indexRecord = records.find((record) => record.fileId === fileId);

    if (!indexRecord) {
      continue;
    }

    const display = parsePlaylistIndexNote({
      ...indexRecord,
      sectionId,
      sectionLabel: getLifeLabSectionLabel(sectionId),
      content: body,
      metadata: indexRecord.metadata,
    });

    for (const video of display.videos) {
      if (!video.videoUrl || !video.noteSlug) {
        continue;
      }

      const note = updates.get(video.noteSlug) ?? bySlug.get(video.noteSlug);

      if (!note || hasListingThumbnailInputs(note.metadata)) {
        continue;
      }

      updates.set(video.noteSlug, {
        ...note,
        metadata: mergeListingMetadata(
          note.metadata,
          listingFieldsFromVideoUrl(video.videoUrl),
        ),
      });
    }
  }

  if (updates.size === 0) {
    return records;
  }

  return records.map((record) => updates.get(record.slug) ?? record);
}

async function prepareYoutubeBrowseRecords(
  sectionId: LifeLabSectionId,
  baseRecords: LifeLabSectionNoteRecord[],
): Promise<{
  records: LifeLabSectionNoteRecord[];
  indexBodies: Map<string, string>;
}> {
  const { records: withIndexes, indexBodies } =
    await enrichPlaylistIndexRecordsForBrowse(sectionId, baseRecords);
  const withPlaylistHydration = hydrateListingMetadataFromPlaylistIndexes(
    sectionId,
    withIndexes,
    indexBodies,
  );
  const withListingMetadata = await attachListingMetadataToBrowseRecords(
    sectionId,
    withPlaylistHydration,
  );

  return {
    records: withListingMetadata,
    indexBodies,
  };
}

async function loadSectionNotes(
  sectionId: LifeLabSectionId,
  options: { useCachedFolderMap?: boolean } = {},
): Promise<LifeLabSectionFileIndex> {
  return loadSectionFileIndex(sectionId, options);
}

async function getSectionNotesCached(
  sectionId: LifeLabSectionId,
): Promise<LifeLabSectionFileIndex> {
  return getSectionFileIndexCached(sectionId);
}

async function getEnrichedSectionRecordsCached(
  sectionId: LifeLabSectionId,
): Promise<{
  records: LifeLabSectionNoteRecord[];
  listingDiagnostic: LifeLabListingDiagnostic;
}> {
  const fileIndex = await getSectionFileIndexCached(sectionId);
  const records = await enrichSectionRecordsFromCache(
    sectionId,
    fileIndex.records,
  );

  return {
    records: filterEnrichedSectionRecords(sectionId, records),
    listingDiagnostic: fileIndex.listingDiagnostic,
  };
}

async function getNoteContentCached(
  sectionId: LifeLabSectionId,
  slug: string,
): Promise<LifeLabNote | null> {
  return getNoteContentCachedDeduped(sectionId, slug);
}

const getNoteContentCachedDeduped = cache(
  async (
    sectionId: LifeLabSectionId,
    slug: string,
  ): Promise<LifeLabNote | null> => {
    const { records: baseRecords } = await getSectionFileIndexCached(sectionId);
    const baseRecord = baseRecords.find((item) => item.slug === slug);

    if (!baseRecord) {
      return null;
    }

    const payload = await getNotePayloadCached(sectionId, baseRecord);

    if (!payload) {
      return null;
    }

    if (
      sectionId === "lecture-notes" &&
      !shouldIncludeLectureNoteInPlanlet({
        sectionId,
        relativePath: payload.record.relativePath,
        metadata: payload.record.metadata,
      })
    ) {
      return null;
    }

    return buildLifeLabNote(payload.record, sectionId, payload.rawContent);
  },
);

type PlaylistAssetIndexNote = Pick<
  LifeLabNote,
  | "slug"
  | "title"
  | "excerpt"
  | "fileId"
  | "relativePath"
  | "subfolderLabel"
  | "metadata"
  | "content"
>;

async function loadPlaylistAssetPayloads(
  sectionId: LifeLabSectionId,
  indexNote: PlaylistAssetIndexNote,
  options: { fresh?: boolean } = {},
): Promise<PlaylistAssetsBundle> {
  const fileIndex = options.fresh
    ? await loadSectionFileIndex(sectionId, { useCachedFolderMap: false })
    : await getSectionFileIndexCached(sectionId);
  const { body } = parseLifeLabFrontmatter(indexNote.content ?? "");
  const { folder, resolution, matches } = resolvePlaylistAssetsForIndexNote(
    indexNote,
    fileIndex.records,
    body,
  );

  if (!resolution) {
    return emptyPlaylistAssetsBundle(folder);
  }

  const loaded = await Promise.all(
    matches.map(async (match) => {
      try {
        const payload = options.fresh
          ? await loadNotePayload(sectionId, match.record)
          : await getNotePayloadCached(sectionId, match.record);

        if (!payload?.rawContent?.trim()) {
          return {
            match,
            content: null,
            rawBody: null,
            fromCache: options.fresh
              ? false
              : getLifeLabCacheResult(
                  "note",
                  lifeLabNotePayloadCacheKey(match.record.fileId),
                ) === "hit",
            error: "Asset file is empty.",
          };
        }

        const { body: rawBody } = parseLifeLabFrontmatter(payload.rawContent);
        const content = preparePlaylistAssetMarkdown(
          rawBody,
          match.definition,
        );

        return {
          match,
          content,
          rawBody,
          fromCache: options.fresh
            ? false
            : getLifeLabCacheResult(
                "note",
                lifeLabNotePayloadCacheKey(match.record.fileId),
              ) === "hit",
          error: null,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Asset could not be loaded.";

        return {
          match,
          content: null,
          rawBody: null,
          fromCache: options.fresh
            ? false
            : getLifeLabCacheResult(
                "note",
                lifeLabNotePayloadCacheKey(match.record.fileId),
              ) === "hit",
          error: message,
        };
      }
    }),
  );

  const clusterMatches = resolvePlaylistClusterRecords(
    resolution,
    fileIndex.records,
  );
  const loadedClusters = await Promise.all(
    clusterMatches.map(async (match) => {
      try {
        const payload = options.fresh
          ? await loadNotePayload(sectionId, match.record)
          : await getNotePayloadCached(sectionId, match.record);

        if (!payload?.rawContent?.trim()) {
          return buildPlaylistClusterFile({
            slug: match.slug,
            relativePath: match.relativePath,
            fileId: match.record.fileId,
            modifiedAt: match.record.modifiedAt,
            rawBody: null,
            error: "Cluster file is empty.",
          });
        }

        const { body: rawBody } = parseLifeLabFrontmatter(payload.rawContent);

        return buildPlaylistClusterFile({
          slug: match.slug,
          relativePath: match.relativePath,
          fileId: match.record.fileId,
          modifiedAt: match.record.modifiedAt,
          rawBody,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Cluster diagram could not be loaded.";

        return buildPlaylistClusterFile({
          slug: match.slug,
          relativePath: match.relativePath,
          fileId: match.record.fileId,
          modifiedAt: match.record.modifiedAt,
          rawBody: null,
          error: message,
        });
      }
    }),
  );

  const bundleWithClusters = buildPlaylistAssetsBundle({
    folder,
    resolution,
    matches,
    loaded,
    clusterRows: parseClusterRowsFromLoadedAssets(loaded),
    clusterFiles: loadedClusters,
  });
  const { suppressedDuplicates, body: strippedIndexBody } =
    suppressDuplicatePlaylistIndexContent({
      indexBody: body,
      assets: bundleWithClusters.artifacts,
      presentAssetIds: matches.map((match) => match.definition.id),
    });

  return {
    ...bundleWithClusters,
    suppressedDuplicates,
    strippedIndexBody,
  };
}

async function getPlaylistAssetsBundleCached(
  sectionId: LifeLabSectionId,
  playlistId: string,
  indexNote: PlaylistAssetIndexNote,
): Promise<PlaylistAssetsBundle> {
  const cacheKeys = playlistAssetsCacheKeyParts({
    sectionId,
    playlistId,
    indexSlug: indexNote.slug,
  });
  const bundleCacheKey = lifeLabPlaylistAssetsBundleCacheKey({
    sectionId,
    playlistId,
    indexSlug: indexNote.slug,
  });
  const tags = [
    lifeLabPlaylistAssetsCacheTag(playlistId),
    lifeLabPlaylistLearningMapCacheTag(playlistId),
    lifeLabPlaylistClustersCacheTag(playlistId),
    lifeLabPlaylistFullMapCacheTag(playlistId),
    lifeLabPlaylistCacheTag(sectionId, indexNote.slug),
    lifeLabSectionCacheTag(sectionId),
    LIFE_LAB_CACHE_TAG,
    ...PLAYLIST_ASSET_IDS.map((assetId) =>
      lifeLabPlaylistAssetCacheTag(playlistId, assetId),
    ),
  ];
  const startedAt = Date.now();

  const result = await unstable_cache(
    async () => {
      beginLifeLabCacheMiss({
        type: "playlist",
        key: bundleCacheKey,
        tags,
      });
      return loadPlaylistAssetPayloads(sectionId, indexNote);
    },
    cacheKeys.bundleCacheKey,
    {
      revalidate: getLifeLabNoteCacheSeconds(),
      tags,
    },
  )();

  finishLifeLabCacheLookup({
    type: "playlist",
    key: bundleCacheKey,
    durationMs: Date.now() - startedAt,
    tags,
    playlistId,
    assetsHit: true,
  });

  return result;
}

function resolveSectionCacheDiagnostic(
  sectionId: LifeLabSectionId,
  loadedAt: string,
  refreshRequested: boolean,
): LifeLabCacheDiagnostic {
  const cacheKey = lifeLabSectionFileIndexCacheKey(sectionId);
  const tags = [
    LIFE_LAB_SECTIONS_CACHE_TAG,
    lifeLabSectionCacheTag(sectionId),
    lifeLabSectionPlaylistsCacheTag(sectionId),
    LIFE_LAB_CACHE_TAG,
  ];
  const result: "hit" | "miss" = refreshRequested
    ? "miss"
    : (getLifeLabCacheResult("section", cacheKey) ?? "miss");

  return buildLifeLabCacheDiagnostic({
    type: "section",
    key: cacheKey,
    result,
    tags,
    cachedAt: loadedAt,
    ttlSeconds: getLifeLabListCacheSeconds(),
  });
}

function resolveNoteCacheDiagnostic(
  fileId: string,
  sectionId: LifeLabSectionId,
  loadedAt: string,
  refreshRequested: boolean,
): LifeLabCacheDiagnostic {
  const cacheKey = lifeLabNotePayloadCacheKey(fileId);
  const tags = [
    lifeLabNoteCacheTag(fileId),
    lifeLabSectionCacheTag(sectionId),
    LIFE_LAB_CACHE_TAG,
  ];
  const result: "hit" | "miss" = refreshRequested
    ? "miss"
    : (getLifeLabCacheResult("note", cacheKey) ?? "miss");

  return buildLifeLabCacheDiagnostic({
    type: "note",
    key: cacheKey,
    result,
    tags,
    cachedAt: loadedAt,
    ttlSeconds: getLifeLabNoteCacheSeconds(),
  });
}

export async function getPlaylistAssetsForIndexNote(
  sectionId: LifeLabSectionId,
  indexNote: PlaylistAssetIndexNote,
  options: { refresh?: boolean } = {},
): Promise<
  PlaylistAssetsBundle & { fromCache: boolean; cache?: LifeLabCacheDiagnostic }
> {
  return runLifeLabRequestTelemetry(
    async () => {
      if (options.refresh) {
        const bundle = await loadPlaylistAssetPayloads(sectionId, indexNote, {
          fresh: true,
        });

        return {
          ...bundle,
          artifacts: orderPlaylistAssetsForDisplay(bundle.artifacts),
          fromCache: false,
        };
      }

      const fileIndex = await getSectionFileIndexCached(sectionId);
      const noteListHit =
        getLifeLabCacheResult(
          "section",
          lifeLabSectionFileIndexCacheKey(sectionId),
        ) === "hit";
      const { body } = parseLifeLabFrontmatter(indexNote.content ?? "");
      const { folder, resolution } = resolvePlaylistAssetsForIndexNote(
        indexNote,
        fileIndex.records,
        body,
      );

      if (!resolution) {
        return {
          ...emptyPlaylistAssetsBundle(folder),
          fromCache: noteListHit,
        };
      }

      const bundleCacheKey = lifeLabPlaylistAssetsBundleCacheKey({
        sectionId,
        playlistId: resolution.playlistId,
        indexSlug: indexNote.slug,
      });
      const bundle = await getPlaylistAssetsBundleCached(
        sectionId,
        resolution.playlistId,
        indexNote,
      );
      const assetsHit =
        getLifeLabCacheResult("playlist", bundleCacheKey) === "hit";
      const loadedAt = new Date().toISOString();

      logLifeLabPlaylistCacheSummary({
        playlistId: resolution.playlistId,
        bundleCacheKey,
        assetsHit,
        noteListHit,
      });

      const cache = {
        ...buildLifeLabCacheDiagnostic({
          type: "playlist",
          key: bundleCacheKey,
          result: assetsHit ? "hit" : "miss",
          tags: [
            lifeLabPlaylistAssetsCacheTag(resolution.playlistId),
            lifeLabPlaylistLearningMapCacheTag(resolution.playlistId),
            lifeLabPlaylistClustersCacheTag(resolution.playlistId),
            lifeLabPlaylistFullMapCacheTag(resolution.playlistId),
            lifeLabPlaylistCacheTag(sectionId, indexNote.slug),
            lifeLabSectionCacheTag(sectionId),
            LIFE_LAB_CACHE_TAG,
          ],
          cachedAt: loadedAt,
          ttlSeconds: getLifeLabNoteCacheSeconds(),
        }),
        noteListHit,
        assetsHit,
      };

      return {
        ...bundle,
        artifacts: orderPlaylistAssetsForDisplay(bundle.artifacts),
        fromCache: assetsHit,
        cache,
      };
    },
    { refreshRequested: options.refresh ?? false },
  );
}

export async function fetchFreshPlaylistAssets(
  sectionId: LifeLabSectionId,
  indexNote: PlaylistAssetIndexNote,
): Promise<void> {
  await loadPlaylistAssetPayloads(sectionId, indexNote, { fresh: true });
}

/** @deprecated Use getPlaylistAssetsForIndexNote */
export const getPlaylistArtifactsForIndexNote = getPlaylistAssetsForIndexNote;

/** @deprecated Use fetchFreshPlaylistAssets */
export const fetchFreshPlaylistArtifacts = fetchFreshPlaylistAssets;

export function refreshLifeLabCache(): void {
  invalidateLifeLabSectionsCache();
}

export function refreshLifeLabSectionCache(
  sectionId: LifeLabSectionId,
): void {
  invalidateLifeLabSectionCache(sectionId);
}

export function refreshLifeLabNoteCache(
  sectionId: LifeLabSectionId,
  slug: string,
  fileId: string,
): void {
  invalidateLifeLabNoteCaches({
    fileId,
    sectionId,
  });
  revalidatePath(`/life-lab/${sectionId}/${slug}`);
}

export async function refreshLifeLabPlaylistCache(
  sectionId: LifeLabSectionId,
  playlistSlug: string,
  fileId: string,
  indexNote?: PlaylistAssetIndexNote,
): Promise<void> {
  invalidateLifeLabPlaylistCache(sectionId, playlistSlug);
  invalidateLifeLabNoteCaches({
    fileId,
    sectionId,
    playlistSlug,
  });

  if (indexNote) {
    const { records } = await getSectionFileIndexCached(sectionId);
    const { body } = parseLifeLabFrontmatter(indexNote.content ?? "");
    const { folder, resolution, matches } = resolvePlaylistAssetsForIndexNote(
      indexNote,
      records,
      body,
    );

    if (resolution) {
      invalidateLifeLabPlaylistAssetsCache(resolution.playlistId);
      invalidateLifeLabPlaylistLearningMapCache(resolution.playlistId);
    }

    for (const match of matches) {
      invalidateLifeLabNoteCaches({
        fileId: match.record.fileId,
        sectionId,
        playlistSlug,
      });

      if (resolution) {
        invalidateLifeLabPlaylistAssetCache(
          resolution.playlistId,
          match.definition.id,
        );
      }
    }
  }

  revalidatePath(`/life-lab/${sectionId}/${playlistSlug}`);
}

export async function getLifeLabHomeData(): Promise<{
  availability: LifeLabAvailability;
  sections: LifeLabSectionSummary[];
}> {
  return runLifeLabRequestTelemetry(async () => {
    const availability = getLifeLabAvailability();

    if (availability.status !== "ready") {
      return { availability, sections: [] };
    }

    const mapResult = await getSectionFolderMap();

    if (!mapResult.ok) {
      return {
        availability: unavailableAvailability(mapResult.error),
        sections: [],
      };
    }

    const folderMap = resolveLifeLabFolderMap(mapResult);

    if (!folderMap) {
      const error = new LifeLabDriveError(
        "Life Lab folder map could not be reconstructed.",
      );

      return {
        availability: unavailableAvailability(error),
        sections: [],
      };
    }

    try {
      const sections = await Promise.all(
        getAllowedLifeLabSectionIds().map(async (sectionId) => {
          const { records } = await getSectionNotesCached(sectionId);

          return {
            id: sectionId,
            label: getLifeLabSectionLabel(sectionId),
            noteCount: records.length,
          };
        }),
      );

      return {
        availability: {
          status: "ready",
        },
        sections,
      };
    } catch (error) {
      const normalized =
        error instanceof Error
          ? error
          : new LifeLabDriveError("Failed to load Life Lab sections.");
      logLifeLabFolderMapFailure(normalized);

      return {
        availability: unavailableAvailability(normalized, true),
        sections: [],
      };
    }
  });
}

type LifeLabSectionDataOptions = {
  refresh?: boolean;
  includeListingDiagnostic?: boolean;
};

export async function getLifeLabSectionData(
  sectionId: string,
  options: LifeLabSectionDataOptions = {},
): Promise<{
  availability: LifeLabAvailability;
  sectionId: LifeLabSectionId | null;
  sectionLabel: string | null;
  notes: LifeLabNoteSummary[];
  groups: LifeLabNoteGroup[];
  filterOptions: LifeLabFilterOptions;
  flashcardNoteCount: number;
  listingDiagnostic: LifeLabListingDiagnostic | null;
}> {
  return runLifeLabRequestTelemetry(
    async () => {
      setLifeLabRequestMeta({
        route: `/life-lab/${sectionId}`,
        sectionId,
      });

      const availability = getLifeLabAvailability();

      if (
        isLifeLabSectionBlocked(sectionId) ||
        !isLifeLabSectionId(sectionId)
      ) {
        return {
          availability,
          sectionId: null,
          sectionLabel: null,
          notes: [],
          groups: [],
          filterOptions: collectLifeLabFilterOptions([]),
          flashcardNoteCount: 0,
          listingDiagnostic: null,
        };
      }

      if (availability.status !== "ready") {
        return {
          availability,
          sectionId,
          sectionLabel: getLifeLabSectionLabel(sectionId),
          notes: [],
          groups: [],
          filterOptions: collectLifeLabFilterOptions([]),
          flashcardNoteCount: 0,
          listingDiagnostic: null,
        };
      }

      try {
        if (options.refresh) {
          refreshLifeLabSectionCache(sectionId);
        }

        const mapResult = await getSectionFolderMap();

        if (!mapResult.ok) {
          return {
            availability: unavailableAvailability(mapResult.error),
            sectionId,
            sectionLabel: getLifeLabSectionLabel(sectionId),
            notes: [],
            groups: [],
            filterOptions: collectLifeLabFilterOptions([]),
            flashcardNoteCount: 0,
            listingDiagnostic: null,
          };
        }

        const loadedAt = new Date().toISOString();

        let records: LifeLabSectionNoteRecord[];
        let listingDiagnosticBase: LifeLabListingDiagnostic;

        if (sectionId === "youtube-learning") {
          if (options.refresh) {
            await loadSectionNotes(sectionId, { useCachedFolderMap: false });
          }

          // Listing uses the file index, slim listing metadata for thumbnails,
          // and full payloads only for playlist indexes (not every video note).
          const cached = await getSectionNotesCached(sectionId);
          const { records: browseRecords, indexBodies } =
            await prepareYoutubeBrowseRecords(sectionId, cached.records);
          records = filterEnrichedSectionRecords(sectionId, browseRecords);
          listingDiagnosticBase = cached.listingDiagnostic;

          const notes = records.map(toNoteSummary);
          const groups = groupLifeLabNotes(notes, { sectionId });
          const folderMap = resolveLifeLabFolderMap(mapResult);
          const driveFolderId = folderMap?.get(sectionId) ?? null;

          diagnoseYoutubePlaylistBrowse({
            sectionId,
            notes,
            groups,
            driveFolderId,
            records,
            indexBodies,
          });

          const listingDiagnostic = options.includeListingDiagnostic
            ? {
                ...listingDiagnosticBase,
                cache: resolveSectionCacheDiagnostic(
                  sectionId,
                  loadedAt,
                  options.refresh ?? false,
                ),
              }
            : null;

          return {
            availability,
            sectionId,
            sectionLabel: getLifeLabSectionLabel(sectionId),
            notes,
            groups,
            filterOptions: collectLifeLabFilterOptions(notes),
            flashcardNoteCount: notes.filter((note) => note.hasFlashcards)
              .length,
            listingDiagnostic,
          };
        }

        // Learning Dictionary / Podcasts / Flashcards need note bodies on list cards.
        if (
          sectionId === "learning-dictionary" ||
          sectionId === "podcasts" ||
          sectionId === "flashcards"
        ) {
          if (options.refresh) {
            await loadSectionNotes(sectionId, { useCachedFolderMap: false });
          }

          const enriched = await getEnrichedSectionRecordsCached(sectionId);
          records = enriched.records;
          listingDiagnosticBase = enriched.listingDiagnostic;
        } else if (options.refresh) {
          const loaded = await loadSectionNotes(sectionId, {
            useCachedFolderMap: false,
          });
          records = loaded.records;
          listingDiagnosticBase = loaded.listingDiagnostic;
        } else {
          const cached = await getSectionNotesCached(sectionId);
          records = cached.records;
          listingDiagnosticBase = cached.listingDiagnostic;
        }

        const notes = records.map(toNoteSummary);
        const groups = groupLifeLabNotes(notes, { sectionId });

        const listingDiagnostic = options.includeListingDiagnostic
          ? {
              ...listingDiagnosticBase,
              cache: resolveSectionCacheDiagnostic(
                sectionId,
                loadedAt,
                options.refresh ?? false,
              ),
            }
          : null;

        return {
          availability,
          sectionId,
          sectionLabel: getLifeLabSectionLabel(sectionId),
          notes,
          groups,
          filterOptions: collectLifeLabFilterOptions(notes),
          flashcardNoteCount: notes.filter((note) => note.hasFlashcards).length,
          listingDiagnostic,
        };
      } catch (error) {
        const normalized =
          error instanceof Error
            ? error
            : new LifeLabDriveError("Failed to load Life Lab section notes.");
        logLifeLabFolderMapFailure(normalized);

        return {
          availability: unavailableAvailability(normalized, true),
          sectionId,
          sectionLabel: getLifeLabSectionLabel(sectionId),
          notes: [],
          groups: [],
          filterOptions: collectLifeLabFilterOptions([]),
          flashcardNoteCount: 0,
          listingDiagnostic: null,
        };
      }
    },
    { refreshRequested: options.refresh ?? false },
  );
}

export async function getLifeLabNoteData(
  sectionId: string,
  slug: string,
  options: { refresh?: boolean; navigationSource?: string } = {},
): Promise<{
  availability: LifeLabAvailability;
  note: LifeLabNote | null;
}> {
  return getLifeLabNoteDataCached(
    sectionId,
    slug,
    options.refresh ?? false,
    options.navigationSource ?? "direct",
  );
}

const getLifeLabNoteDataCached = cache(
  async (
    sectionId: string,
    slug: string,
    refresh: boolean,
    navigationSource: string,
  ): Promise<{
    availability: LifeLabAvailability;
    note: LifeLabNote | null;
  }> => {
    return runLifeLabRequestTelemetry(
      async () => {
        setLifeLabRequestMeta({
          route: `/life-lab/${sectionId}/${slug}`,
          sectionId,
          noteSlug: slug,
          navigationSource,
        });

        const availability = getLifeLabAvailability();

        if (
          isLifeLabSectionBlocked(sectionId) ||
          !isLifeLabSectionId(sectionId)
        ) {
          return { availability, note: null };
        }

        if (availability.status !== "ready") {
          return { availability, note: null };
        }

        try {
          if (refresh) {
            const { records: baseRecords } =
              await getSectionFileIndexCached(sectionId);
            const baseRecord = baseRecords.find((item) => item.slug === slug);

            if (baseRecord) {
              refreshLifeLabNoteCache(sectionId, slug, baseRecord.fileId);
            }
          }

          const mapResult = await getSectionFolderMap();

          if (!mapResult.ok) {
            return {
              availability: unavailableAvailability(mapResult.error),
              note: null,
            };
          }

          const loadedAt = new Date().toISOString();
          const note = refresh
            ? await loadNoteContent(sectionId, slug)
            : await getNoteContentCached(sectionId, slug);

          if (!note) {
            return { availability, note: null };
          }

          setLifeLabRequestMeta({
            noteId: note.fileId,
            cacheKey: lifeLabNotePayloadCacheKey(note.fileId),
          });

          const cacheDiagnostic = resolveNoteCacheDiagnostic(
            note.fileId,
            sectionId,
            loadedAt,
            refresh,
          );

          return {
            availability,
            note: attachLifeLabNoteLoadMeta(note, cacheDiagnostic),
          };
        } catch (error) {
          const normalized =
            error instanceof Error
              ? error
              : new LifeLabDriveError("Failed to load Life Lab note.");
          logLifeLabFolderMapFailure(normalized);

          return {
            availability: unavailableAvailability(normalized, true),
            note: null,
          };
        }
      },
      {
        refreshRequested: refresh,
        meta: {
          route: `/life-lab/${sectionId}/${slug}`,
          sectionId,
          noteSlug: slug,
          navigationSource,
        },
      },
    );
  },
);

/**
 * Prefer a single owning playlist-index payload (or zero) over loading every
 * playlist index in the section. Falls back to lightweight section records.
 */
export async function getYoutubeVideoPlaylistNavigation(
  sectionId: LifeLabSectionId,
  slug: string,
): Promise<PlaylistVideoNavigation | null> {
  if (sectionId !== "youtube-learning") {
    return null;
  }

  const { records } = await getSectionNotesCached(sectionId);
  const videoRecord = records.find((record) => record.slug === slug);

  if (!videoRecord || !isYoutubeVideoNote(videoRecord)) {
    return null;
  }

  const candidateSlug = findPlaylistIndexSlugByMetadata(records, videoRecord);

  if (candidateSlug) {
    const playlistNote = await getNoteContentCached(sectionId, candidateSlug);

    if (playlistNote) {
      const display = parsePlaylistIndexNote(playlistNote);
      const indexedNavigation = buildVideoPlaylistNavigation(
        display,
        videoRecord.slug,
        candidateSlug,
        sectionId,
      );

      if (indexedNavigation) {
        return indexedNavigation;
      }

      return resolveYoutubeVideoPlaylistNavigation(
        records,
        videoRecord,
        sectionId,
        new Map([[candidateSlug, display]]),
      );
    }
  }

  return buildPlaylistNavigationFromVideoNotes(records, videoRecord, sectionId);
}

/**
 * First-paint playlist chrome from the section file index only (no note payloads).
 */
export async function getYoutubeVideoPlaylistNavigationLightweight(
  sectionId: LifeLabSectionId,
  slug: string,
): Promise<PlaylistVideoNavigation | null> {
  if (sectionId !== "youtube-learning") {
    return null;
  }

  const { records } = await getSectionNotesCached(sectionId);
  const videoRecord = records.find((record) => record.slug === slug);

  if (!videoRecord || !isYoutubeVideoNote(videoRecord)) {
    return null;
  }

  const fromMembers = buildPlaylistNavigationFromVideoNotes(
    records,
    videoRecord,
    sectionId,
  );

  if (fromMembers) {
    return fromMembers;
  }

  const indexSlug = findPlaylistIndexSlugByMetadata(records, videoRecord);

  if (!indexSlug) {
    return null;
  }

  const indexRecord = records.find((record) => record.slug === indexSlug);

  if (!indexRecord) {
    return null;
  }

  return {
    playlistIndexHref: `/life-lab/${sectionId}/${indexSlug}`,
    playlistTitle:
      indexRecord.metadata?.playlist?.trim() ||
      indexRecord.title ||
      "Playlist",
    previous: null,
    next: null,
    currentEpisode:
      videoRecord.metadata?.episode != null
        ? String(videoRecord.metadata.episode)
        : null,
  };
}

async function loadNoteContent(
  sectionId: LifeLabSectionId,
  slug: string,
): Promise<LifeLabNote | null> {
  const { records: baseRecords } = await loadSectionFileIndex(sectionId, {
    useCachedFolderMap: false,
  });
  const baseRecord = baseRecords.find((item) => item.slug === slug);

  if (!baseRecord) {
    return null;
  }

  const payload = await loadNotePayload(sectionId, baseRecord);

  if (!payload) {
    return null;
  }

  if (
    sectionId === "lecture-notes" &&
    !shouldIncludeLectureNoteInPlanlet({
      sectionId,
      relativePath: payload.record.relativePath,
      metadata: payload.record.metadata,
    })
  ) {
    return null;
  }

  return buildLifeLabNote(payload.record, sectionId, payload.rawContent);
}

function buildLifeLabNote(
  record: LifeLabSectionNoteRecord,
  sectionId: LifeLabSectionId,
  content: string,
): LifeLabNote {
  const { body, technicalProvenance: frontmatterTechnical } =
    parseLifeLabFrontmatter(content);
  const processed = processLifeLabNoteContent(
    {
      ...record,
      sectionId,
    },
    content,
  );
  const summary = toNoteSummary(processed);
  const { dev: _summaryDev, ...baseSummary } = summary;
  const sourceUrl = resolveLifeLabSourceUrl({
    metadata: processed.metadata,
    body,
  });
  const displayContent = sourceUrl
    ? stripSourceUrlLineFromMarkdown(body, sourceUrl)
    : body;
  const flashcards = processed.flashcards ?? extractFlashcardsFromMarkdown(body);
  const technicalProvenance = extractTechnicalProvenanceForDebug(
    displayContent,
    frontmatterTechnical,
  );

  const note: LifeLabNote = {
    ...baseSummary,
    sectionId,
    sectionLabel: getLifeLabSectionLabel(sectionId),
    content: displayContent,
    flashcards,
    technicalProvenance:
      technicalProvenance.length > 0 ? technicalProvenance : undefined,
  };

  if (isLifeLabDevToolsEnabled()) {
    note.dev = {
      ...toNoteDevMeta(record),
      fromCache: false,
      loadedAt: new Date().toISOString(),
    };
  }

  return note;
}

function attachLifeLabNoteLoadMeta(
  note: LifeLabNote,
  cache: LifeLabCacheDiagnostic,
): LifeLabNote {
  if (!isLifeLabDevToolsEnabled() || !note.dev) {
    return note;
  }

  return {
    ...note,
    dev: {
      ...note.dev,
      fromCache: cache.fromCache,
      loadedAt: cache.cachedAt,
      cache,
    },
  };
}

export async function resolveLifeLabNoteRecord(
  sectionId: string,
  slug: string,
): Promise<LifeLabSectionNoteRecord | null> {
  if (isLifeLabSectionBlocked(sectionId) || !isLifeLabSectionId(sectionId)) {
    return null;
  }

  const { records } = await getSectionNotesCached(sectionId);
  return records.find((item) => item.slug === slug) ?? null;
}

export async function getLifeLabRawMarkdown(
  sectionId: string,
  slug: string,
): Promise<{ content: string; filename: string } | null> {
  const record = await resolveLifeLabNoteRecord(sectionId, slug);

  if (!record) {
    return null;
  }

  const credentials = getLifeLabDriveCredentials();
  if (!credentials) {
    return null;
  }

  const content = await downloadDriveFile(credentials, record.fileId);

  return {
    content,
    filename: relativePathFilename(record.relativePath),
  };
}

export type LifeLabDiagramAsset = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

export async function getLifeLabDiagramAsset(
  sectionId: string,
  slug: string,
  assetName: string,
  format: "png" | "svg" | "mmd",
): Promise<LifeLabDiagramAsset | null> {
  if (
    !isLifeLabSectionId(sectionId) ||
    isLifeLabSectionBlocked(sectionId) ||
    !/^[a-z0-9][a-z0-9_-]{0,80}$/i.test(assetName)
  ) {
    return null;
  }

  const record = await resolveLifeLabNoteRecord(sectionId, slug);
  const credentials = getLifeLabDriveCredentials();
  const mapResult = await getSectionFolderMap();

  if (!record || !credentials || !mapResult.ok) {
    return null;
  }

  const sectionFolderId = resolveLifeLabFolderMap(mapResult)?.get(sectionId);

  if (!sectionFolderId) {
    return null;
  }

  const relativePath = record.relativePath.replace(/\\/g, "/");
  const parts = relativePath.split("/");
  const filename = parts.pop() ?? "";
  const directory = parts.join("/");
  const noteStem = filename.replace(/\.[^.]+$/, "");
  const directories = new Set<string>([
    [directory, noteStem, "assets"].filter(Boolean).join("/"),
    [directory, "assets"].filter(Boolean).join("/"),
  ]);

  if (parts.at(-1)?.toLowerCase() === "episodes") {
    directories.add([...parts.slice(0, -1), "assets"].join("/"));
  }

  for (const assetDirectory of directories) {
    const assetPath = [assetDirectory, `${assetName}.${format}`]
      .filter(Boolean)
      .join("/");
    const file = await findDriveFileByRelativePath(
      credentials,
      sectionFolderId,
      assetPath,
    );

    if (!file) {
      continue;
    }

    const contentType =
      format === "png"
        ? "image/png"
        : format === "svg"
          ? "image/svg+xml"
          : "text/plain;charset=utf-8";

    return {
      bytes: await downloadDriveFileBytes(credentials, file.id),
      contentType,
      filename: `${assetName}.${format}`,
    };
  }

  return null;
}

function recordsToStudyCards(
  records: LifeLabSectionNoteRecord[],
  sectionId: LifeLabSectionId,
): LifeLabStudyCard[] {
  const sectionLabel = getLifeLabSectionLabel(sectionId);
  const cards: LifeLabStudyCard[] = [];

  for (const record of records) {
    if (!record.flashcards?.length) {
      continue;
    }

    for (const flashcard of record.flashcards) {
      cards.push({
        ...flashcard,
        noteSlug: record.slug,
        noteTitle: record.title,
        sectionId,
        sectionLabel,
        playlist: record.metadata?.playlist,
        tags: record.metadata?.tags,
        topics: record.metadata?.topics,
        source: record.metadata?.source,
      });
    }
  }

  return cards;
}

export async function getLifeLabStudyData(
  sectionId: string,
  filters: LifeLabNoteFilters = {},
): Promise<{
  availability: LifeLabAvailability;
  sectionId: LifeLabSectionId | null;
  sectionLabel: string | null;
  cards: LifeLabStudyCard[];
}> {
  const sectionData = await getLifeLabSectionData(sectionId);

  if (!sectionData.sectionId || !sectionData.sectionLabel) {
    return {
      availability: sectionData.availability,
      sectionId: null,
      sectionLabel: null,
      cards: [],
    };
  }

  const filteredNotes = filterLifeLabNotes(sectionData.notes, filters);
  const filteredSlugs = new Set(filteredNotes.map((note) => note.slug));
  const { records: baseRecords } = await getSectionNotesCached(sectionData.sectionId);
  const studyRecords = (
    await Promise.all(
      baseRecords
        .filter((record) => filteredSlugs.has(record.slug))
        .map(async (baseRecord) => {
          const payload = await getNotePayloadCached(
            sectionData.sectionId!,
            baseRecord,
          );

          return payload?.record ?? baseRecord;
        }),
    )
  ).filter((record) => record.flashcards?.length);

  return {
    availability: sectionData.availability,
    sectionId: sectionData.sectionId,
    sectionLabel: sectionData.sectionLabel,
    cards: recordsToStudyCards(studyRecords, sectionData.sectionId),
  };
}

export async function getLifeLabBrowseData(): Promise<{
  availability: LifeLabAvailability;
  notes: LifeLabBrowseNote[];
  filterOptions: LifeLabFilterOptions;
  flashcardNoteCount: number;
}> {
  return runLifeLabRequestTelemetry(
    async () => {
      setLifeLabRequestMeta({ route: "/life-lab" });

      const availability = getLifeLabAvailability();

      if (availability.status !== "ready") {
        return {
          availability,
          notes: [],
          filterOptions: collectLifeLabFilterOptions([]),
          flashcardNoteCount: 0,
        };
      }

      const sections = await Promise.all(
        getAllowedLifeLabSectionIds().map(async (sectionId) => {
          const { records } = await getSectionNotesCached(sectionId);
          const browseRecords =
            sectionId === "youtube-learning"
              ? (
                  await prepareYoutubeBrowseRecords(sectionId, records)
                ).records
              : sectionId === "podcasts"
                ? await enrichSectionRecordsFromCache(sectionId, records)
                : records;
          const filtered = filterEnrichedSectionRecords(
            sectionId,
            browseRecords,
          );
          const sectionLabel = getLifeLabSectionLabel(sectionId);

          return filtered.map((record) => ({
            ...toNoteSummary(record),
            sectionId,
            sectionLabel,
          }));
        }),
      );

      const notes = sections.flat();

      return {
        availability,
        notes,
        filterOptions: collectLifeLabFilterOptions(notes),
        flashcardNoteCount: notes.filter((note) => note.hasFlashcards).length,
      };
    },
    { meta: { route: "/life-lab" } },
  );
}

export async function getLifeLabAllStudyData(
  filters: LifeLabNoteFilters = {},
): Promise<{
  availability: LifeLabAvailability;
  cards: LifeLabStudyCard[];
}> {
  return runLifeLabRequestTelemetry(
    async () => {
      setLifeLabRequestMeta({ route: "/life-lab/study" });

      const availability = getLifeLabAvailability();

      if (availability.status !== "ready") {
        return {
          availability,
          cards: [],
        };
      }

      const cards: LifeLabStudyCard[] = [];

      await Promise.all(
        getAllowedLifeLabSectionIds().map(async (sectionId) => {
          const { records } = await getEnrichedSectionRecordsCached(sectionId);
          const summaries = records.map((record) => ({
            ...toNoteSummary(record),
            sectionId,
            sectionLabel: getLifeLabSectionLabel(sectionId),
          }));
          const filteredNotes = filterLifeLabNotes(
            summaries,
            filters,
          ) as LifeLabBrowseNote[];
          const allowedSlugs = new Set(filteredNotes.map((note) => note.slug));

          cards.push(
            ...recordsToStudyCards(
              records.filter(
                (record) =>
                  allowedSlugs.has(record.slug) && record.flashcards?.length,
              ),
              sectionId,
            ),
          );
        }),
      );

      return {
        availability,
        cards,
      };
    },
    { meta: { route: "/life-lab/study" } },
  );
}

function deckFromDedicatedRecord(
  record: LifeLabSectionNoteRecord,
  rawContent: string,
): FlashcardDeckSummary {
  return buildFlashcardDeckFromContent({
    slug: record.slug,
    relativePath: record.relativePath,
    titleFallback: record.title,
    content: rawContent,
    modifiedAt: record.modifiedAt,
    modifiedAtLabel: record.modifiedAtLabel,
    origin: "dedicated",
    sourceSectionId: "flashcards",
  });
}

export async function getLifeLabFlashcardDecksData(): Promise<{
  availability: LifeLabAvailability;
  decks: FlashcardDeckSummary[];
}> {
  return runLifeLabRequestTelemetry(
    async () => {
      setLifeLabRequestMeta({ route: "/life-lab/flashcards" });

      const availability = getLifeLabAvailability();

      if (availability.status !== "ready") {
        return { availability, decks: [] };
      }

      const decks: FlashcardDeckSummary[] = [];
      const seen = new Set<string>();

      const dedicated = await getEnrichedSectionRecordsCached("flashcards");
      const credentials = getLifeLabDriveCredentials();

      for (const record of dedicated.records) {
        const payload = await getNotePayloadCached("flashcards", record);
        const content = payload?.rawContent ?? "";
        const deck = deckFromDedicatedRecord(
          payload?.record ?? record,
          content,
        );

        if (!seen.has(deck.id)) {
          seen.add(deck.id);
          decks.push(deck);
        }
      }

      await Promise.all(
        getAllowedLifeLabSectionIds()
          .filter((sectionId) => sectionId !== "flashcards")
          .map(async (sectionId) => {
            const { records } = await getEnrichedSectionRecordsCached(sectionId);

            for (const record of records) {
              if (!record.flashcards?.length) {
                continue;
              }

              const embedded = buildEmbeddedFlashcardDeck({
                note: {
                  ...record,
                  sectionId,
                  sectionLabel: getLifeLabSectionLabel(sectionId),
                },
                cards: record.flashcards,
              });

              if (embedded && !seen.has(embedded.id)) {
                seen.add(embedded.id);
                decks.push(embedded);
              }

              const deckPath = resolveFlashcardDeckPathFromMetadata(
                record.metadata,
              );

              if (!deckPath || !credentials) {
                continue;
              }

              // Frontmatter may point at a dedicated deck; surface a reference
              // deck when the dedicated section copy was not already listed.
              const referenced = buildFlashcardDeckFromContent({
                slug: `${sectionId}__ref__${record.slug}`,
                relativePath: deckPath,
                titleFallback: record.title,
                content: "",
                modifiedAt: record.modifiedAt,
                modifiedAtLabel: record.modifiedAtLabel,
                origin: "reference",
                sourceSectionId: sectionId,
                sourceNoteHref: `/life-lab/${sectionId}/${record.slug}`,
                sourceNoteTitle: record.title,
              });

              // Prefer embedded cards from the note when the referenced file
              // is not loaded here; mark unavailable only when note has no cards.
              if (
                record.flashcards.length === 0 &&
                referenced.cardCount === 0 &&
                !seen.has(referenced.id)
              ) {
                seen.add(referenced.id);
                decks.push({
                  ...referenced,
                  parseIssues: [
                    {
                      line: 0,
                      message: "Referenced flashcard deck file is unavailable.",
                    },
                  ],
                });
              }
            }
          }),
      );

      return { availability, decks };
    },
    { meta: { route: "/life-lab/flashcards" } },
  );
}

/**
 * Canonical flashcard library summary for home, Flashcards section, and Study all.
 * Archive exclusion is applied per-user via archivedKeys (not shared-cacheable).
 */
export async function getLifeLabFlashcardSummary(
  archivedKeys: ReadonlySet<string> = new Set(),
): Promise<{
  availability: LifeLabAvailability;
  decks: FlashcardDeckSummary[];
  summary: LifeLabFlashcardSummary;
}> {
  return runLifeLabRequestTelemetry(
    async () => {
      setLifeLabRequestMeta({
        route: "/life-lab/flashcards",
        cacheKey: lifeLabFlashcardSummaryCacheKey(),
      });

      const { availability, decks } = await getLifeLabFlashcardDecksData();

      if (availability.status !== "ready") {
        return {
          availability,
          decks: [],
          summary: EMPTY_LIFE_LAB_FLASHCARD_SUMMARY,
        };
      }

      return {
        availability,
        decks,
        summary: summarizeFlashcardDecks(decks, archivedKeys),
      };
    },
    { meta: { route: "/life-lab/flashcards" } },
  );
}

export async function getLifeLabFlashcardDeckBySlug(
  deckSlug: string,
): Promise<{
  availability: LifeLabAvailability;
  deck: FlashcardDeckSummary | null;
  unavailableReason: "missing" | "parse" | null;
}> {
  const { availability, decks } = await getLifeLabFlashcardDecksData();

  if (availability.status !== "ready") {
    return { availability, deck: null, unavailableReason: null };
  }

  const deck =
    decks.find((item) => item.slug === deckSlug || item.id === deckSlug) ??
    null;

  if (!deck) {
    return { availability, deck: null, unavailableReason: "missing" };
  }

  if (deck.cardCount === 0 && deck.parseIssues.length > 0) {
    return { availability, deck, unavailableReason: "parse" };
  }

  if (deck.cardCount === 0) {
    return { availability, deck, unavailableReason: "missing" };
  }

  return { availability, deck, unavailableReason: null };
}

export async function fetchFreshLifeLabHome(): Promise<void> {
  await loadSectionFolderMap();

  await Promise.all(
    getAllowedLifeLabSectionIds().map((sectionId) =>
      loadSectionNotes(sectionId, { useCachedFolderMap: false }),
    ),
  );
}

export async function fetchFreshLifeLabSection(
  sectionId: LifeLabSectionId,
): Promise<void> {
  await loadSectionNotes(sectionId, { useCachedFolderMap: false });
}

export async function fetchFreshLifeLabNote(
  sectionId: LifeLabSectionId,
  slug: string,
): Promise<LifeLabNote | null> {
  return loadNoteContent(sectionId, slug);
}
