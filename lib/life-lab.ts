import { unstable_cache } from "next/cache";

import {
  LIFE_LAB_CACHE_SECONDS,
  LIFE_LAB_UNAVAILABLE_MESSAGE,
  LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE,
  type LifeLabAvailability,
  type LifeLabNote,
  type LifeLabNoteSummary,
  type LifeLabSectionId,
  type LifeLabSectionSummary,
} from "@/lib/life-lab/constants";
import {
  downloadDriveFile,
  getLifeLabDriveCredentials,
  isMarkdownDriveFile,
  LifeLabDriveError,
  listDriveChildren,
  type DriveCredentials,
  type DriveFile,
} from "@/lib/life-lab/google-drive";
import {
  getAllowedLifeLabSectionIds,
  getLifeLabSectionLabel,
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
  sectionIdFromFolderName,
} from "@/lib/life-lab/sections";
import {
  driveFilenameToSlug,
  markdownExcerpt,
  parseDateFromFilename,
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

export function getLifeLabAvailability(): LifeLabAvailability {
  const credentials = getLifeLabDriveCredentials();

  if (!credentials) {
    return {
      status: "unconfigured",
      adminMessage: LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE,
    };
  }

  return { status: "ready" };
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

function noteTitleFromFile(file: DriveFile, slug: string): string {
  const datePrefix = parseDateFromFilename(file.name);
  const title = slugToTitle(slug);

  if (datePrefix) {
    return title;
  }

  return title;
}

function noteSortValue(note: LifeLabNoteSummary): number {
  if (note.modifiedAt) {
    return new Date(note.modifiedAt).getTime();
  }

  const datePrefix = parseDateFromFilename(`${note.slug}.md`);
  if (datePrefix) {
    return new Date(`${datePrefix}T12:00:00Z`).getTime();
  }

  return 0;
}

function summarizeMarkdownFile(file: DriveFile, content?: string): LifeLabNoteSummary {
  const slug = driveFilenameToSlug(file.name);
  const excerptSource = content ?? "";
  const modifiedAt = file.modifiedTime ?? null;

  return {
    slug,
    title: noteTitleFromFile(file, slug),
    excerpt: excerptSource ? markdownExcerpt(excerptSource) : "",
    modifiedAt,
    modifiedAtLabel: formatModifiedLabel(modifiedAt),
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

async function listMarkdownFilesInFolder(
  credentials: DriveCredentials,
  folderId: string,
): Promise<DriveFile[]> {
  const children = await listDriveChildren(credentials, folderId);
  return children.filter(isMarkdownDriveFile);
}

const getSectionFolderMapCached = unstable_cache(
  async () => {
    const credentials = getLifeLabDriveCredentials();
    if (!credentials) {
      throw new LifeLabDriveError("Life Lab Drive credentials are missing.");
    }

    return listSectionFolders(credentials);
  },
  ["life-lab-section-folder-map"],
  { revalidate: LIFE_LAB_CACHE_SECONDS },
);

const getSectionNotesCached = unstable_cache(
  async (sectionId: LifeLabSectionId) => {
    const credentials = getLifeLabDriveCredentials();
    if (!credentials) {
      throw new LifeLabDriveError("Life Lab Drive credentials are missing.");
    }

    const folderMap = await listSectionFolders(credentials);
    const folderId = folderMap.get(sectionId);

    if (!folderId) {
      return [] as LifeLabNoteSummary[];
    }

    const files = await listMarkdownFilesInFolder(credentials, folderId);

    return files
      .map((file) => summarizeMarkdownFile(file))
      .sort((a, b) => noteSortValue(b) - noteSortValue(a));
  },
  ["life-lab-section-notes"],
  { revalidate: LIFE_LAB_CACHE_SECONDS },
);

const getNoteContentCached = unstable_cache(
  async (sectionId: LifeLabSectionId, slug: string) => {
    const credentials = getLifeLabDriveCredentials();
    if (!credentials) {
      throw new LifeLabDriveError("Life Lab Drive credentials are missing.");
    }

    const folderMap = await listSectionFolders(credentials);
    const folderId = folderMap.get(sectionId);

    if (!folderId) {
      return null;
    }

    const files = await listMarkdownFilesInFolder(credentials, folderId);
    const file = files.find((item) => driveFilenameToSlug(item.name) === slug);

    if (!file) {
      return null;
    }

    const content = await downloadDriveFile(credentials, file.id);
    const summary = summarizeMarkdownFile(file, content);

    return {
      ...summary,
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

  try {
    const folderMap = await getSectionFolderMapCached();
    const sections = await Promise.all(
      getAllowedLifeLabSectionIds().map(async (sectionId) => {
        const folderId = folderMap.get(sectionId);
        let noteCount = 0;

        if (folderId) {
          const credentials = getLifeLabDriveCredentials();
          if (credentials) {
            const files = await listMarkdownFilesInFolder(credentials, folderId);
            noteCount = files.length;
          }
        }

        return {
          id: sectionId,
          label: getLifeLabSectionLabel(sectionId),
          noteCount,
        };
      }),
    );

    return { availability, sections };
  } catch (error) {
    console.warn("[planlet] life lab home load failed:", error);
    return {
      availability: {
        status: "unavailable",
        message: LIFE_LAB_UNAVAILABLE_MESSAGE,
      },
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
    const notes = await getSectionNotesCached(sectionId);
    return {
      availability,
      sectionId,
      sectionLabel: getLifeLabSectionLabel(sectionId),
      notes,
    };
  } catch (error) {
    console.warn("[planlet] life lab section load failed:", error);
    return {
      availability: {
        status: "unavailable",
        message: LIFE_LAB_UNAVAILABLE_MESSAGE,
      },
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
    const note = await getNoteContentCached(sectionId, slug);
    return { availability, note };
  } catch (error) {
    console.warn("[planlet] life lab note load failed:", error);
    return {
      availability: {
        status: "unavailable",
        message: LIFE_LAB_UNAVAILABLE_MESSAGE,
      },
      note: null,
    };
  }
}
