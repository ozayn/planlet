import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import {
  getLifeLabCacheSeconds,
  LIFE_LAB_CACHE_SECONDS,
  LIFE_LAB_CACHE_TAG,
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
  enrichSectionNoteRecords,
  processLifeLabNoteContent,
  type LifeLabSectionNoteRecord,
} from "@/lib/life-lab/enrichment";
import { collectLifeLabFilterOptions, type LifeLabFilterOptions, type LifeLabNoteFilters, filterLifeLabNotes } from "@/lib/life-lab/filters";
import { parseLifeLabFrontmatter } from "@/lib/life-lab/frontmatter";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
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

export type { LifeLabFilterOptions, LifeLabNoteFilters, LifeLabFilterKey } from "@/lib/life-lab/filters";
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
) {
  return listMarkdownFilesRecursive(credentials, folderId);
}

const getSectionFolderMapCached = unstable_cache(
  loadSectionFolderMap,
  ["life-lab-section-folder-map"],
  {
    revalidate: getLifeLabCacheSeconds(),
    tags: [LIFE_LAB_CACHE_TAG],
  },
);

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

async function loadSectionNotes(
  sectionId: LifeLabSectionId,
  options: { useCachedFolderMap?: boolean } = {},
): Promise<{
  records: LifeLabSectionNoteRecord[];
  listingDiagnostic: LifeLabListingDiagnostic;
}> {
  const mapResult = options.useCachedFolderMap === false
    ? await loadSectionFolderMap()
    : await getSectionFolderMap();

  if (!mapResult.ok) {
    return {
      records: [],
      listingDiagnostic: {
        fileCount: 0,
        foldersTraversed: 0,
        maxDepthUsed: 0,
        paginationOccurred: false,
      },
    };
  }

  const credentials = getLifeLabDriveCredentials();
  if (!credentials) {
    return {
      records: [],
      listingDiagnostic: {
        fileCount: 0,
        foldersTraversed: 0,
        maxDepthUsed: 0,
        paginationOccurred: false,
      },
    };
  }

  const folderMap = resolveLifeLabFolderMap(mapResult);
  const folderId = folderMap?.get(sectionId);

  if (!folderId) {
    return {
      records: [],
      listingDiagnostic: {
        fileCount: 0,
        foldersTraversed: 0,
        maxDepthUsed: 0,
        paginationOccurred: false,
      },
    };
  }

  const { entries, stats } = await listSectionMarkdownFiles(credentials, folderId);
  const baseRecords = dedupeSectionNoteRecords(
    entries.map((entry) => summarizeMarkdownEntry(entry)),
  );
  const records = await enrichSectionNoteRecords(credentials, baseRecords);

  return {
    records,
    listingDiagnostic: toListingDiagnostic(stats),
  };
}

const getSectionNotesCached = unstable_cache(
  async (sectionId: LifeLabSectionId) => loadSectionNotes(sectionId),
  ["life-lab-section-notes-recursive"],
  {
    revalidate: getLifeLabCacheSeconds(),
    tags: [LIFE_LAB_CACHE_TAG],
  },
);

const getNoteContentCached = unstable_cache(
  async (sectionId: LifeLabSectionId, slug: string) => {
    const { records } = await getSectionNotesCached(sectionId);
    const record = records.find((item) => item.slug === slug);

    if (!record) {
      return null;
    }

    const credentials = getLifeLabDriveCredentials();
    if (!credentials) {
      return null;
    }

    const content = await downloadDriveFile(credentials, record.fileId);

    return buildLifeLabNote(record, sectionId, content);
  },
  ["life-lab-note-content"],
  {
    revalidate: getLifeLabCacheSeconds(),
    tags: [LIFE_LAB_CACHE_TAG],
  },
);

export function refreshLifeLabCache(): void {
  revalidateTag(LIFE_LAB_CACHE_TAG, "max");
}

export function refreshLifeLabNoteCache(
  sectionId: LifeLabSectionId,
  slug: string,
): void {
  revalidatePath(`/life-lab/${sectionId}/${slug}`);
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
        const folderId = folderMap.get(sectionId);
        let noteCount = 0;

        if (folderId) {
          const credentials = getLifeLabDriveCredentials();
          if (credentials) {
            const { stats } = await listSectionMarkdownFiles(
              credentials,
              folderId,
            );
            noteCount = stats.fileCount;
          }
        }

        return {
          id: sectionId,
          label: getLifeLabSectionLabel(sectionId),
          noteCount,
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
      refreshLifeLabCache();
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

    const { records, listingDiagnostic } = options.refresh
      ? await loadSectionNotes(sectionId, { useCachedFolderMap: false })
      : await getSectionNotesCached(sectionId);
    const notes = records.map(toNoteSummary);

    return {
      availability,
      sectionId,
      sectionLabel: getLifeLabSectionLabel(sectionId),
      notes,
      groups: groupLifeLabNotes(notes, { sectionId }),
      filterOptions: collectLifeLabFilterOptions(notes),
      flashcardNoteCount: notes.filter((note) => note.hasFlashcards).length,
      listingDiagnostic: options.includeListingDiagnostic
        ? listingDiagnostic
        : null,
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
      refreshLifeLabNoteCache(sectionId, slug);
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

async function loadNoteContent(
  sectionId: LifeLabSectionId,
  slug: string,
): Promise<LifeLabNote | null> {
  const { records } = await loadSectionNotes(sectionId, {
    useCachedFolderMap: false,
  });
  const record = records.find((item) => item.slug === slug);

  if (!record) {
    return null;
  }

  const credentials = getLifeLabDriveCredentials();
  if (!credentials) {
    return null;
  }

  const content = await downloadDriveFile(credentials, record.fileId);

  return buildLifeLabNote(record, sectionId, content);
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
  const flashcards = processed.flashcards ?? extractFlashcardsFromMarkdown(body);

  const note: LifeLabNote = {
    ...baseSummary,
    sectionId,
    sectionLabel: getLifeLabSectionLabel(sectionId),
    content: body,
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

  const { records } = await loadSectionNotes(sectionId);
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
  const { records } = await getSectionNotesCached(sectionData.sectionId);
  const studyRecords = records.filter(
    (record) => filteredSlugs.has(record.slug) && record.flashcards?.length,
  );

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
      const { records } = await getSectionNotesCached(sectionId);
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

      const { records } = await getSectionNotesCached(sectionId);
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
