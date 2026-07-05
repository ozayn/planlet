import { unstable_cache } from "next/cache";

import {
  LIFE_LAB_CACHE_SECONDS,
  LIFE_LAB_UNAVAILABLE_MESSAGE,
  LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE,
  type LifeLabAvailability,
  type LifeLabDiagnostic,
  type LifeLabNote,
  type LifeLabNoteSummary,
  type LifeLabSectionId,
  type LifeLabSectionSummary,
} from "@/lib/life-lab/constants";
import {
  downloadDriveFile,
  getLifeLabDriveCredentials,
  LifeLabDriveError,
  listDriveChildren,
  listMarkdownFilesRecursive,
  type DriveCredentials,
  type DriveMarkdownEntry,
} from "@/lib/life-lab/google-drive";
import {
  getAllowedLifeLabSectionIds,
  getLifeLabSectionLabel,
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
  sectionIdFromFolderName,
} from "@/lib/life-lab/sections";
import {
  driveRelativePathToSlug,
  isReadmeSlug,
  markdownExcerpt,
  parseDateFromFilename,
  relativePathSubfolder,
  slugToTitle,
} from "@/lib/life-lab/slug";
import { canAccessLifeLabPage, type UserAccess } from "@/lib/roles";

export {
  LIFE_LAB_ALLOWED_SECTIONS,
  LIFE_LAB_BLOCKED_SECTION_IDS,
  LIFE_LAB_CACHE_SECONDS,
  LIFE_LAB_DRIVE_READONLY_SCOPE,
  LIFE_LAB_UNAVAILABLE_MESSAGE,
  LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE,
} from "@/lib/life-lab/constants";

export type {
  LifeLabAvailability,
  LifeLabDiagnostic,
  LifeLabNote,
  LifeLabNoteSummary,
  LifeLabSectionId,
  LifeLabSectionSummary,
} from "@/lib/life-lab/constants";

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

function noteTitleFromSlug(slug: string): string {
  return slugToTitle(slug);
}

function noteSortValue(note: LifeLabNoteSummary): number {
  if (note.modifiedAt) {
    return new Date(note.modifiedAt).getTime();
  }

  const datePrefix = parseDateFromFilename(`${note.slug.split("__").at(-1) ?? note.slug}.md`);
  if (datePrefix) {
    return new Date(`${datePrefix}T12:00:00Z`).getTime();
  }

  return 0;
}

function sortLifeLabNotes(notes: LifeLabNoteSummary[]): LifeLabNoteSummary[] {
  const hasContentNotes = notes.some((note) => !isReadmeSlug(note.slug));

  return [...notes].sort((left, right) => {
    if (hasContentNotes) {
      const leftReadme = isReadmeSlug(left.slug);
      const rightReadme = isReadmeSlug(right.slug);

      if (leftReadme !== rightReadme) {
        return leftReadme ? 1 : -1;
      }
    }

    return noteSortValue(right) - noteSortValue(left);
  });
}

type LifeLabSectionNoteRecord = LifeLabNoteSummary & {
  fileId: string;
  relativePath: string;
};

function summarizeMarkdownEntry(
  entry: DriveMarkdownEntry,
  content?: string,
): LifeLabSectionNoteRecord {
  const { file, relativePath } = entry;
  const slug = driveRelativePathToSlug(relativePath);
  const excerptSource = content ?? "";
  const modifiedAt = file.modifiedTime ?? null;

  return {
    slug,
    title: noteTitleFromSlug(slug),
    excerpt: excerptSource ? markdownExcerpt(excerptSource) : "",
    modifiedAt,
    modifiedAtLabel: formatModifiedLabel(modifiedAt),
    subfolderLabel: relativePathSubfolder(relativePath),
    fileId: file.id,
    relativePath,
  };
}

function toNoteSummary(record: LifeLabSectionNoteRecord): LifeLabNoteSummary {
  return {
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    modifiedAt: record.modifiedAt,
    modifiedAtLabel: record.modifiedAtLabel,
    subfolderLabel: record.subfolderLabel,
  };
}

async function listSectionFolders(
  credentials: DriveCredentials,
): Promise<Map<LifeLabSectionId, string>> {
  const children = await listDriveChildren(credentials, credentials.rootFolderId);
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
): Promise<DriveMarkdownEntry[]> {
  return listMarkdownFilesRecursive(credentials, folderId);
}

const getSectionFolderMapCached = unstable_cache(
  loadSectionFolderMap,
  ["life-lab-section-folder-map"],
  { revalidate: LIFE_LAB_CACHE_SECONDS },
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

const getSectionNotesCached = unstable_cache(
  async (sectionId: LifeLabSectionId) => {
    const mapResult = await getSectionFolderMap();

    if (!mapResult.ok) {
      return [] as LifeLabSectionNoteRecord[];
    }

    const credentials = getLifeLabDriveCredentials();
    if (!credentials) {
      return [] as LifeLabSectionNoteRecord[];
    }

    const folderMap = resolveLifeLabFolderMap(mapResult);
    const folderId = folderMap?.get(sectionId);

    if (!folderId) {
      return [] as LifeLabSectionNoteRecord[];
    }

    const entries = await listSectionMarkdownFiles(credentials, folderId);

    return entries.map((entry) => summarizeMarkdownEntry(entry));
  },
  ["life-lab-section-notes-recursive"],
  { revalidate: LIFE_LAB_CACHE_SECONDS },
);

const getNoteContentCached = unstable_cache(
  async (sectionId: LifeLabSectionId, slug: string) => {
    const records = await getSectionNotesCached(sectionId);
    const record = records.find((item) => item.slug === slug);

    if (!record) {
      return null;
    }

    const credentials = getLifeLabDriveCredentials();
    if (!credentials) {
      return null;
    }

    const content = await downloadDriveFile(credentials, record.fileId);

    return {
      ...toNoteSummary(record),
      sectionId,
      sectionLabel: getLifeLabSectionLabel(sectionId),
      content,
    } satisfies LifeLabNote;
  },
  ["life-lab-note-content"],
  { revalidate: LIFE_LAB_CACHE_SECONDS },
);

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
            const entries = await listSectionMarkdownFiles(credentials, folderId);
            noteCount = entries.length;
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

export async function getLifeLabSectionData(
  sectionId: string,
): Promise<{
  availability: LifeLabAvailability;
  sectionId: LifeLabSectionId | null;
  sectionLabel: string | null;
  notes: LifeLabNoteSummary[];
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
    };
  }

  if (availability.status !== "ready") {
    return {
      availability,
      sectionId,
      sectionLabel: getLifeLabSectionLabel(sectionId),
      notes: [],
    };
  }

  try {
    const mapResult = await getSectionFolderMap();

    if (!mapResult.ok) {
      return {
        availability: unavailableAvailability(mapResult.error),
        sectionId,
        sectionLabel: getLifeLabSectionLabel(sectionId),
        notes: [],
      };
    }

    const notes = sortLifeLabNotes(
      (await getSectionNotesCached(sectionId)).map(toNoteSummary),
    );
    return {
      availability,
      sectionId,
      sectionLabel: getLifeLabSectionLabel(sectionId),
      notes,
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
    };
  }
}

export async function getLifeLabNoteData(
  sectionId: string,
  slug: string,
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
    const mapResult = await getSectionFolderMap();

    if (!mapResult.ok) {
      return {
        availability: unavailableAvailability(mapResult.error),
        note: null,
      };
    }

    const note = await getNoteContentCached(sectionId, slug);
    return { availability, note };
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
