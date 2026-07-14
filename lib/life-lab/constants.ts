export const LIFE_LAB_CACHE_SECONDS = 1800;

export {
  getLifeLabCacheSeconds,
  getLifeLabListCacheSeconds,
  getLifeLabNoteCacheSeconds,
  LIFE_LAB_CACHE_TAG,
  LIFE_LAB_SECTIONS_CACHE_TAG,
} from "@/lib/life-lab/cache";

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
  "film-lab": {
    label: "Film Lab",
    folderName: "film-lab",
  },
  "lecture-notes": {
    label: "Lecture Notes",
    folderName: "lecture-notes",
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

export type LifeLabNoteImage = {
  url: string;
  title?: string;
  source?: string;
  license?: string;
  credit?: string;
  alt?: string;
};

export type LifeLabNoteMetadata = {
  type?: string;
  section?: string;
  source?: string;
  input_source?: string;
  language?: string;
  transcript_available?: boolean;
  speaker_count?: number;
  privacy?: string;
  privacy_classification?: string;
  channel?: string;
  channelName?: string;
  youtubeChannel?: string;
  sourceChannel?: string;
  channelId?: string;
  youtubeChannelId?: string;
  channel_id?: string;
  youtube_channel_id?: string;
  playlist?: string;
  playlist_url?: string;
  collectionPath?: string;
  playlistPath?: string;
  folderPath?: string;
  collectionSlug?: string;
  videosPath?: string;
  videos_path?: string;
  youtubePlaylistId?: string;
  youtube_playlist_id?: string;
  playlist_id?: string;
  playlistId?: string;
  asset_id?: string;
  assetId?: string;
  assets_path?: string;
  assetsPath?: string;
  asset_path?: string;
  assetPath?: string;
  playlistAssetPath?: string;
  playlist_asset_path?: string;
  assetFolderId?: string;
  asset_folder_id?: string;
  source_url?: string;
  video_url?: string;
  episode?: string | number;
  date?: string;
  topics?: string[];
  people?: string[];
  places?: string[];
  tags?: string[];
  term?: string;
  display_title?: string;
  aliases?: string[];
  meaning?: string;
  occurrences?: number | string;
  source_notes?: string[];
  category?: string;
  related?: string[];
  presenters?: string[];
  presenter?: string | string[];
  instructor?: string | string[];
  instructors?: string[];
  host?: string | string[];
  hosts?: string[];
  lecturer?: string | string[];
  lecturers?: string[];
  cloudStopTerms?: string[];
  cloud_stop_terms?: string[];
  cloudBoostTerms?: string[];
  cloud_boost_terms?: string[];
  summary?: string;
  study_status?: string;
  reviewed?: boolean;
  flashcards?: boolean;
  image?: LifeLabNoteImage;
  thumbnail?: LifeLabNoteImage;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  imageUrl?: string;
  videoId?: string;
  youtubeVideoId?: string;
  video_id?: string;
  youtube_video_id?: string;
  youtubeUrl?: string;
  youtube_url?: string;
  sourceUrl?: string;
  coverImage?: LifeLabNoteImage;
  youtube_thumbnail?: LifeLabNoteImage;
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
  cache?: LifeLabCacheDiagnostic;
};

export type LifeLabCacheDiagnostic = {
  fromCache: boolean;
  cacheKey: string;
  cacheTags: string[];
  cachedAt: string;
  expiresAt: string;
  driveCalls?: number;
  filesFetched?: string[];
  staleFallback?: boolean;
  refreshRequested?: boolean;
  noteListHit?: boolean;
  assetsHit?: boolean;
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
  cache?: LifeLabCacheDiagnostic;
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
  technicalProvenance?: string[];
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
