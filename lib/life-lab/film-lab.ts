import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { markdownExcerpt } from "@/lib/life-lab/slug";
import {
  isReadmeRelativePath,
  isReadmeSlug,
  relativePathFilename,
  slugToRelativePath,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";

export const FILM_LAB_GROUP_IDS = [
  "taste-map",
  "imdb-summaries",
  "recommendations",
  "favorites",
  "themes",
  "directors",
  "countries",
] as const;

export type FilmLabGroupId = (typeof FILM_LAB_GROUP_IDS)[number];

export const FILM_LAB_GROUP_LABELS: Record<FilmLabGroupId, string> = {
  "taste-map": "Taste Map",
  "imdb-summaries": "IMDb Summaries",
  recommendations: "Recommendations",
  favorites: "Favorites",
  themes: "Themes",
  directors: "Directors",
  countries: "Countries",
};

const FILM_LAB_GROUP_SET = new Set<string>(FILM_LAB_GROUP_IDS);

const FILM_LAB_FOLDER_TO_GROUP: Record<string, FilmLabGroupId> = {
  imdb: "imdb-summaries",
  recommendations: "recommendations",
  favorites: "favorites",
  themes: "themes",
  directors: "directors",
  countries: "countries",
  "taste-map": "taste-map",
};

const FILM_LAB_RAW_DATA_EXTENSIONS = /\.(csv|tsv|json|xml|txt)$/i;

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").trim().toLowerCase();
}

export function isFilmLabGroupId(value: string): value is FilmLabGroupId {
  return FILM_LAB_GROUP_SET.has(value);
}

export function filmLabGroupLabel(groupId: string): string {
  if (isFilmLabGroupId(groupId)) {
    return FILM_LAB_GROUP_LABELS[groupId];
  }

  return groupId.charAt(0).toUpperCase() + groupId.slice(1);
}

function isRawFolderPath(normalizedPath: string): boolean {
  const segments = normalizedPath.split("/").filter(Boolean);

  return segments.includes("raw");
}

export function isFilmLabExcludedRelativePath(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);

  if (!normalized.endsWith(".md")) {
    return true;
  }

  if (FILM_LAB_RAW_DATA_EXTENSIONS.test(normalized)) {
    return true;
  }

  if (isRawFolderPath(normalized)) {
    return true;
  }

  return false;
}

export function isFilmLabExcludedFolder(folderName: string, prefix: string): boolean {
  const nextPrefix = prefix ? `${prefix}/${folderName}` : folderName;
  const normalized = normalizeRelativePath(nextPrefix);

  return isRawFolderPath(normalized) || normalized.endsWith("/raw");
}

export function isFilmLabNote(input: {
  relativePath?: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
}): boolean {
  if (input.metadata?.section === "film-lab") {
    return true;
  }

  if (input.metadata?.type === "film-lab" || input.metadata?.type === "film-summary") {
    return true;
  }

  const relativePath = input.relativePath;

  if (!relativePath || isFilmLabExcludedRelativePath(relativePath)) {
    return false;
  }

  const group = classifyFilmLabNoteGroup({
    slug: "",
    relativePath,
  });

  return isFilmLabGroupId(group);
}

export function classifyFilmLabNoteGroup(
  note: Pick<LifeLabNoteSummary, "slug" | "relativePath">,
): string {
  const relativePath = note.relativePath || slugToRelativePath(note.slug);

  if (isReadmeRelativePath(relativePath)) {
    return "about";
  }

  if (isFilmLabExcludedRelativePath(relativePath)) {
    return "reference";
  }

  const parts = relativePath.split("/").filter(Boolean);
  const filename = relativePathFilename(relativePath)
    .replace(/\.md$/i, "")
    .toLowerCase();

  if (filename === "taste-map" || parts[0]?.toLowerCase() === "taste-map") {
    return "taste-map";
  }

  const topFolder = parts.length > 1 ? parts[0]?.toLowerCase() : null;

  if (topFolder && FILM_LAB_FOLDER_TO_GROUP[topFolder]) {
    return FILM_LAB_FOLDER_TO_GROUP[topFolder];
  }

  if (filename.endsWith("-summary") && parts[0]?.toLowerCase() === "imdb") {
    return "imdb-summaries";
  }

  return "reference";
}

export function compareFilmLabGroupIds(left: string, right: string): number {
  const leftIndex = FILM_LAB_GROUP_IDS.indexOf(left as FilmLabGroupId);
  const rightIndex = FILM_LAB_GROUP_IDS.indexOf(right as FilmLabGroupId);
  const leftPrimary = leftIndex !== -1;
  const rightPrimary = rightIndex !== -1;

  if (leftPrimary && rightPrimary) {
    return leftIndex - rightIndex;
  }

  if (leftPrimary !== rightPrimary) {
    return leftPrimary ? -1 : 1;
  }

  if (left === "reference") {
    return -1;
  }

  if (right === "reference") {
    return 1;
  }

  if (left === "about") {
    return 1;
  }

  if (right === "about") {
    return -1;
  }

  return left.localeCompare(right);
}

function extractLabeledSummary(body: string): string | null {
  const match = body.match(
    /^\*\*Summary\*\*\s*\n+([\s\S]*?)(?=\n##\s+|\n\*\*[A-Za-z ][^*]+\*\*|\n---\s*$|$)/im,
  );

  return match?.[1]?.trim() ?? null;
}

export function extractFilmLabPreview(
  body: string,
  metadata?: LifeLabNoteMetadata,
): string {
  if (metadata?.summary?.trim()) {
    return markdownExcerpt(metadata.summary, 180);
  }

  const labeled = extractLabeledSummary(body);

  if (labeled) {
    return markdownExcerpt(labeled, 180);
  }

  const withoutHeading = body.replace(/^#\s+.+\n+/, "").trim();
  const firstParagraph = withoutHeading
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block &&
        !block.startsWith("#") &&
        !/^\*\*[A-Za-z ]+\*\*\s*$/.test(block),
    );

  return firstParagraph
    ? markdownExcerpt(firstParagraph, 180)
    : markdownExcerpt(withoutHeading, 180);
}

export function filmLabDisplayTitle(input: {
  title: string;
  metadata?: LifeLabNoteMetadata;
  body: string;
}): string {
  const heading = titleFromMarkdownHeading(input.body);

  if (heading) {
    return heading;
  }

  return input.title;
}

export function isFilmLabReferenceNote(
  note: Pick<LifeLabNoteSummary, "slug" | "relativePath">,
): boolean {
  if (isReadmeSlug(note.slug)) {
    return true;
  }

  const relativePath = note.relativePath || slugToRelativePath(note.slug);

  return classifyFilmLabNoteGroup(note) === "reference";
}
