export const LIFE_LAB_CACHE_SECONDS = 600;

export const LIFE_LAB_CACHE_TAG = "life-lab";

export function getLifeLabCacheSeconds(): number {
  return process.env.NODE_ENV === "development" ? 30 : LIFE_LAB_CACHE_SECONDS;
}

export const LIFE_LAB_MAX_FOLDER_DEPTH = 5;

export const LIFE_LAB_MAX_FILES_PER_SECTION = 300;

export const LIFE_LAB_DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";

export const LIFE_LAB_ALLOWED_SECTIONS = {
  "youtube-learning": {
    label: "YouTube learning",
    folderName: "youtube-learning",
  },
  "art-history": {
    label: "Art history",
    folderName: "art-history",
  },
  "learning-map": {
    label: "Learning map",
    folderName: "learning-map",
  },
  photography: {
    label: "Photography",
    folderName: "photography",
  },
  "reading-briefs": {
    label: "Reading Briefs",
    folderName: "reading-briefs",
  },
  "learning-dictionary": {
    label: "Learning Dictionary",
    folderName: "learning-dictionary",
  },
} as const;

export type LifeLabSectionId = keyof typeof LIFE_LAB_ALLOWED_SECTIONS;

export const LIFE_LAB_BLOCKED_SECTION_IDS = [
  "therapy-prep",
  "health-notes",
  "social-energy",
  "daily-notes",
  "conversations",
  "archive",
] as const;

export type LifeLabSectionSummary = {
  id: LifeLabSectionId;
  label: string;
  noteCount: number;
};

export type LifeLabNoteMetadata = {
  type?: string;
  section?: string;
  source?: string;
  channel?: string;
  playlist?: string;
  playlist_url?: string;
  episode?: string | number;
  date?: string;
  topics?: string[];
  people?: string[];
  places?: string[];
  tags?: string[];
  term?: string;
  category?: string;
  related?: string[];
  study_status?: string;
  reviewed?: boolean;
  flashcards?: boolean;
};

export type LifeLabNoteSummary = {
  slug: string;
  title: string;
  excerpt: string;
  modifiedAt: string | null;
  modifiedAtLabel: string | null;
  dateLabel: string | null;
  subfolderLabel: string | null;
  fileId: string;
  relativePath: string;
  metadata?: LifeLabNoteMetadata;
  searchText?: string;
  hasFlashcards?: boolean;
  flashcardCount?: number;
  dev?: LifeLabNoteDevMeta;
};

export type LifeLabNoteGroup = {
  id: string;
  label: string;
  notes: LifeLabNoteSummary[];
  collapsedByDefault: boolean;
  variant: "primary" | "disclosure";
};

export type LifeLabListingDiagnostic = {
  fileCount: number;
  foldersTraversed: number;
  maxDepthUsed: number;
  paginationOccurred: boolean;
};

export type LifeLabNoteDevMeta = {
  fileId: string;
  relativePath: string;
  filename: string;
  parentFolder: string | null;
  mimeType: string | null;
  modifiedAt: string | null;
  fileSizeBytes: number | null;
};

export type LifeLabNoteLoadMeta = {
  fromCache: boolean;
  loadedAt: string;
};

export type LifeLabFlashcard = {
  question: string;
  answer: string;
};

export type LifeLabStudyCard = LifeLabFlashcard & {
  noteSlug: string;
  noteTitle: string;
  sectionId: LifeLabSectionId;
  sectionLabel: string;
  playlist?: string;
  tags?: string[];
  topics?: string[];
  source?: string;
};

export type LifeLabNote = LifeLabNoteSummary & {
  sectionId: LifeLabSectionId;
  sectionLabel: string;
  content: string;
  flashcards?: LifeLabFlashcard[];
  dev?: LifeLabNoteDevMeta & LifeLabNoteLoadMeta;
};

export type LifeLabBrowseNote = LifeLabNoteSummary & {
  sectionId: LifeLabSectionId;
  sectionLabel: string;
};

export type LifeLabDiagnostic = {
  driveCredentialsPresent: boolean;
  rootFolderIdPresent: boolean;
  folderMapLoaded: boolean;
  errorName?: string;
  errorMessage?: string;
};

export type LifeLabAvailability =
  | { status: "ready" }
  | {
      status: "unconfigured";
      adminMessage: string;
      diagnostic: LifeLabDiagnostic;
    }
  | {
      status: "unavailable";
      message: string;
      diagnostic: LifeLabDiagnostic;
    };

export const LIFE_LAB_UNAVAILABLE_MESSAGE =
  "Life Lab notes are temporarily unavailable.";

export const LIFE_LAB_UNCONFIGURED_ADMIN_MESSAGE =
  "Life Lab is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and LIFE_LAB_DRIVE_FOLDER_ID.";
