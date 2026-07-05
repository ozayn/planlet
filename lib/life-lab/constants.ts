export const LIFE_LAB_CACHE_SECONDS = 600;

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
} as const;

export type LifeLabSectionId = keyof typeof LIFE_LAB_ALLOWED_SECTIONS;

export const LIFE_LAB_BLOCKED_SECTION_IDS = [
  "therapy-prep",
  "health-notes",
  "social-energy",
  "daily-notes",
] as const;

export type LifeLabSectionSummary = {
  id: LifeLabSectionId;
  label: string;
  noteCount: number;
};

export type LifeLabNoteSummary = {
  slug: string;
  title: string;
  excerpt: string;
  modifiedAt: string | null;
  modifiedAtLabel: string | null;
};

export type LifeLabNote = LifeLabNoteSummary & {
  sectionId: LifeLabSectionId;
  sectionLabel: string;
  content: string;
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
