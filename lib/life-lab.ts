import { revalidatePath, unstable_cache } from "next/cache";

import {
  getLifeLabListCacheSeconds,
  getLifeLabNoteCacheSeconds,
  lifeLabCacheExpiresAt,
  lifeLabNoteCacheTag,
  lifeLabPlaylistAssetCacheTag,
  lifeLabPlaylistAssetsCacheTag,
  lifeLabPlaylistLearningMapCacheTag,
  lifeLabPlaylistCacheTag,
  lifeLabSectionCacheTag,
  LIFE_LAB_CACHE_TAG,
  LIFE_LAB_SECTIONS_CACHE_TAG,
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
} from "@/lib/life-lab/constants";
import {
  processLifeLabNoteContent,
  type LifeLabSectionNoteRecord,
} from "@/lib/life-lab/enrichment";
import { collectLifeLabFilterOptions, type LifeLabFilterOptions, type LifeLabNoteFilters, filterLifeLabNotes } from "@/lib/life-lab/filters";
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
import {
  resolveLifeLabSourceUrl,
  stripSourceUrlLineFromMarkdown,
} from "@/lib/life-lab/source-url";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import {
  downloadDriveFile,
  getLifeLabDriveCredentials,
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
  classifyNoteGroup,
  groupLifeLabNotes,
  noteAssignmentPriority,
} from "@/lib/life-lab/organization";
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
  isPlaylistIndexNote,
  isPlaylistIndexSummaryRecord,
  isYoutubeVideoNote,
  parsePlaylistIndexNote,
  resolveYoutubeVideoPlaylistNavigation,
  type PlaylistIndexDisplay,
  type PlaylistVideoNavigation,
} from "@/lib/life-lab/playlist-index";
import {
  buildPlaylistAssetsBundle,
  emptyPlaylistAssetDiagnostics,
  emptyPlaylistAssetsBundle,
  orderPlaylistAssetsForDisplay,
  PLAYLIST_ASSET_IDS,
  playlistAssetsCacheKeyParts,
  preparePlaylistAssetMarkdown,
  resolvePlaylistAssetsForIndexNote,
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
    shouldSkipFolder:
      sectionId === "film-lab"
        ? (folderName, prefix) => isFilmLabExcludedFolder(folderName, prefix)
        : undefined,
  });
}

function filterSectionMarkdownEntries(
  entries: DriveMarkdownEntry[],
  sectionId: LifeLabSectionId,
): DriveMarkdownEntry[] {
  if (sectionId !== "film-lab") {
    return entries;
  }

  return entries.filter(
    (entry) => !isFilmLabExcludedRelativePath(entry.relativePath),
  );
}

async function getSectionFolderMapCached(): Promise<LifeLabFolderMapResult> {
  return unstable_cache(
    loadSectionFolderMap,
    ["life-lab-section-folder-map"],
    {
      revalidate: getLifeLabListCacheSeconds(),
      tags: [LIFE_LAB_SECTIONS_CACHE_TAG, LIFE_LAB_CACHE_TAG],
    },
  )();
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
  const records = dedupeSectionNoteRecords(
    visibleEntries.map((entry) => summarizeMarkdownEntry(entry)),
  );

  return {
    records,
    listingDiagnostic: toListingDiagnostic(stats),
  };
}

async function getSectionFileIndexCached(
  sectionId: LifeLabSectionId,
): Promise<LifeLabSectionFileIndex> {
  return unstable_cache(
    async () => loadSectionFileIndex(sectionId),
    ["life-lab-section-file-index", sectionId],
    {
      revalidate: getLifeLabListCacheSeconds(),
      tags: [
        LIFE_LAB_SECTIONS_CACHE_TAG,
        lifeLabSectionCacheTag(sectionId),
        LIFE_LAB_CACHE_TAG,
      ],
    },
  )();
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
    record: processLifeLabNoteContent(baseRecord, rawContent),
    rawContent,
  };
}

async function getNotePayloadCached(
  sectionId: LifeLabSectionId,
  baseRecord: LifeLabSectionNoteRecord,
): Promise<LifeLabNotePayload | null> {
  return unstable_cache(
    async () => loadNotePayload(sectionId, baseRecord),
    ["life-lab-note-payload", baseRecord.fileId],
    {
      revalidate: getLifeLabNoteCacheSeconds(),
      tags: [
        lifeLabNoteCacheTag(baseRecord.fileId),
        lifeLabSectionCacheTag(sectionId),
        LIFE_LAB_CACHE_TAG,
      ],
    },
  )();
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
    records,
    listingDiagnostic: fileIndex.listingDiagnostic,
  };
}

async function getNoteContentCached(
  sectionId: LifeLabSectionId,
  slug: string,
): Promise<LifeLabNote | null> {
  const { records: baseRecords } = await getSectionFileIndexCached(sectionId);
  const baseRecord = baseRecords.find((item) => item.slug === slug);

  if (!baseRecord) {
    return null;
  }

  const payload = await getNotePayloadCached(sectionId, baseRecord);

  if (!payload) {
    return null;
  }

  return buildLifeLabNote(payload.record, sectionId, payload.rawContent);
}

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
            fromCache: !options.fresh,
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
          fromCache: !options.fresh,
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
          fromCache: !options.fresh,
          error: message,
        };
      }
    }),
  );

  const interimBundle = buildPlaylistAssetsBundle({
    folder,
    resolution,
    matches,
    loaded,
  });
  const { suppressedDuplicates, body: strippedIndexBody } =
    suppressDuplicatePlaylistIndexContent({
      indexBody: body,
      assets: interimBundle.artifacts,
    });

  return {
    ...interimBundle,
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

  return unstable_cache(
    async () => loadPlaylistAssetPayloads(sectionId, indexNote),
    cacheKeys.bundleCacheKey,
    {
      revalidate: getLifeLabNoteCacheSeconds(),
      tags: [
        lifeLabPlaylistAssetsCacheTag(playlistId),
        lifeLabPlaylistLearningMapCacheTag(playlistId),
        lifeLabPlaylistCacheTag(sectionId, indexNote.slug),
        lifeLabSectionCacheTag(sectionId),
        LIFE_LAB_CACHE_TAG,
        ...PLAYLIST_ASSET_IDS.map((assetId) =>
          lifeLabPlaylistAssetCacheTag(playlistId, assetId),
        ),
      ],
    },
  )();
}

export async function getPlaylistAssetsForIndexNote(
  sectionId: LifeLabSectionId,
  indexNote: PlaylistAssetIndexNote,
  options: { refresh?: boolean } = {},
): Promise<PlaylistAssetsBundle & { fromCache: boolean }> {
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
  const { body } = parseLifeLabFrontmatter(indexNote.content ?? "");
  const { folder, resolution } = resolvePlaylistAssetsForIndexNote(
    indexNote,
    fileIndex.records,
    body,
  );

  if (!resolution) {
    return {
      ...emptyPlaylistAssetsBundle(folder),
      fromCache: true,
    };
  }

  const bundle = await getPlaylistAssetsBundleCached(
    sectionId,
    resolution.playlistId,
    indexNote,
  );

  return {
    ...bundle,
    artifacts: orderPlaylistAssetsForDisplay(bundle.artifacts),
    fromCache: true,
  };
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

    const fromCache = !options.refresh;
    const loadedAt = new Date().toISOString();
    const { records, listingDiagnostic: listingDiagnosticBase } = options.refresh
      ? await loadSectionNotes(sectionId, { useCachedFolderMap: false })
      : await getSectionNotesCached(sectionId);
    const notes = records.map(toNoteSummary);
    const listingDiagnostic = options.includeListingDiagnostic
      ? {
          ...listingDiagnosticBase,
          cache: {
            fromCache,
            cacheKey: `life-lab:section:${sectionId}`,
            cacheTags: [
              LIFE_LAB_SECTIONS_CACHE_TAG,
              lifeLabSectionCacheTag(sectionId),
            ],
            cachedAt: loadedAt,
            expiresAt: lifeLabCacheExpiresAt(
              loadedAt,
              getLifeLabListCacheSeconds(),
            ),
          },
        }
      : null;

    return {
      availability,
      sectionId,
      sectionLabel: getLifeLabSectionLabel(sectionId),
      notes,
      groups: groupLifeLabNotes(notes, { sectionId }),
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
}

export async function getLifeLabNoteData(
  sectionId: string,
  slug: string,
  options: { refresh?: boolean } = {},
): Promise<{
  availability: LifeLabAvailability;
  note: LifeLabNote | null;
}> {
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
    if (options.refresh) {
      const { records: baseRecords } = await getSectionFileIndexCached(sectionId);
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

    const fromCache = !options.refresh;
    const loadedAt = new Date().toISOString();
    const note = options.refresh
      ? await loadNoteContent(sectionId, slug)
      : await getNoteContentCached(sectionId, slug);

    return {
      availability,
      note: note ? attachLifeLabNoteLoadMeta(note, fromCache, loadedAt) : null,
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
}

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

  const playlistIndexRecords = records.filter((record) =>
    isPlaylistIndexSummaryRecord(record),
  );

  const playlistContents = new Map<string, PlaylistIndexDisplay>();

  for (const record of playlistIndexRecords) {
    const playlistNote = await getNoteContentCached(sectionId, record.slug);

    if (!playlistNote) {
      continue;
    }

    playlistContents.set(record.slug, parsePlaylistIndexNote(playlistNote));
  }

  return resolveYoutubeVideoPlaylistNavigation(
    records,
    videoRecord,
    sectionId,
    playlistContents,
  );
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

  return buildLifeLabNote(payload.record, sectionId, payload.rawContent);
}

function buildLifeLabNote(
  record: LifeLabSectionNoteRecord,
  sectionId: LifeLabSectionId,
  content: string,
): LifeLabNote {
  const { body } = parseLifeLabFrontmatter(content);
  const processed = processLifeLabNoteContent(record, content);
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

  const note: LifeLabNote = {
    ...baseSummary,
    sectionId,
    sectionLabel: getLifeLabSectionLabel(sectionId),
    content: displayContent,
    flashcards,
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
  fromCache: boolean,
  loadedAt: string,
): LifeLabNote {
  if (!isLifeLabDevToolsEnabled() || !note.dev) {
    return note;
  }

  return {
    ...note,
    dev: {
      ...note.dev,
      fromCache,
      loadedAt,
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
      const { records } = await getEnrichedSectionRecordsCached(sectionId);
      const sectionLabel = getLifeLabSectionLabel(sectionId);

      return records.map((record) => ({
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
}

export async function getLifeLabAllStudyData(
  filters: LifeLabNoteFilters = {},
): Promise<{
  availability: LifeLabAvailability;
  cards: LifeLabStudyCard[];
}> {
  const browseData = await getLifeLabBrowseData();

  if (browseData.availability.status !== "ready") {
    return {
      availability: browseData.availability,
      cards: [],
    };
  }

  const filteredNotes = filterLifeLabNotes(
    browseData.notes,
    filters,
  ) as LifeLabBrowseNote[];
  const cards: LifeLabStudyCard[] = [];

  await Promise.all(
    getAllowedLifeLabSectionIds().map(async (sectionId) => {
      const sectionSlugs = new Set(
        filteredNotes
          .filter((note) => note.sectionId === sectionId)
          .map((note) => note.slug),
      );

      if (sectionSlugs.size === 0) {
        return;
      }

      const { records } = await getEnrichedSectionRecordsCached(sectionId);
      cards.push(
        ...recordsToStudyCards(
          records.filter(
            (record) => sectionSlugs.has(record.slug) && record.flashcards?.length,
          ),
          sectionId,
        ),
      );
    }),
  );

  return {
    availability: browseData.availability,
    cards,
  };
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
