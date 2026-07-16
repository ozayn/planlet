import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  noteContentDateValue,
  noteAddedDateValue,
} from "@/lib/life-lab/browse";
import {
  parseDateFromFilename,
  relativePathFilename,
  slugToRelativePath,
} from "@/lib/life-lab/slug";
import { readingBriefDisplayTitle } from "@/lib/life-lab/reading-briefs";

export type ReadingBriefKind =
  | "dailyBrief"
  | "savedArticle"
  | "reference"
  | "internal";

export type ReadingBriefArchiveTypeFilter =
  | "all"
  | "dailyBrief"
  | "savedArticle"
  | "reference";

export type ReadingBriefDateFilter = "all" | "week" | "month";

export type ReadingBriefArchiveSort =
  | "newest"
  | "oldest"
  | "source"
  | "title";

export type ReadingBriefSourceCollection = {
  sourceKey: string;
  sourceLabel: string;
  count: number;
  latestNote: LifeLabNoteSummary;
  latestDateLabel: string | null;
  notes: LifeLabNoteSummary[];
};

const SOURCE_TITLE_MAP: Record<string, string> = {
  "bbc world service": "BBC World Service",
  "bbc world service daily brief": "BBC World Service",
  bbc: "BBC",
  "the guardian": "The Guardian",
  "foreign affairs": "Foreign Affairs",
};

const REFERENCE_TITLE_MAP: Record<string, string> = {
  readme: "How Reading Briefs works",
  "how reading briefs works": "How Reading Briefs works",
  interests: "Interests",
  sources: "Sources",
  workflow: "Daily brief workflow",
  "daily bbc world service workflow": "Daily brief workflow",
  "daily brief workflow": "Daily brief workflow",
};

const REFERENCE_FILENAME_PATTERNS = [
  /^readme\.md$/i,
  /^sources\.md$/i,
  /^interests\.md$/i,
  /workflow/i,
  /^index\.md$/i,
];

const SAVED_ARTICLE_TYPES = new Set([
  "article",
  "essay",
  "saved-article",
  "saved_article",
  "saved-essay",
  "saved_essay",
]);

const DAILY_BRIEF_TYPES = new Set([
  "reading-brief",
  "daily-brief",
  "daily_brief",
]);

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function pathSegments(relativePath: string): string[] {
  return relativePath.split("/").filter(Boolean);
}

/** Section-relative path, also accepting optional `reading-briefs/` prefix. */
function normalizedRelativePath(note: {
  relativePath?: string;
  slug: string;
}): string {
  const raw =
    note.relativePath?.trim() || slugToRelativePath(note.slug);
  return raw.replace(/^reading-briefs\//i, "");
}

function filenameStem(relativePath: string): string {
  return relativePathFilename(relativePath)
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase();
}

function metadataString(
  metadata: LifeLabNoteSummary["metadata"] | undefined,
  key: string,
): string | null {
  if (!metadata) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Classify a Reading Briefs note for the archive layout.
 * Prefers path and frontmatter over display title.
 */
export function classifyReadingBriefNote(
  note: Pick<
    LifeLabNoteSummary,
    "slug" | "relativePath" | "subfolderLabel" | "title" | "metadata"
  >,
): ReadingBriefKind {
  const relativePath = normalizedRelativePath(note);
  const pathLower = relativePath.toLowerCase();
  const filename = relativePathFilename(relativePath);
  const type = note.metadata?.type?.trim().toLowerCase() ?? "";
  const contentKind =
    metadataString(note.metadata, "contentKind")?.toLowerCase() ??
    metadataString(note.metadata, "content_kind")?.toLowerCase() ??
    "";
  const subfolder = note.subfolderLabel?.trim().toLowerCase() ?? "";

  if (
    type === "internal" ||
    note.metadata?.privacy === "hidden" ||
    note.metadata?.privacy_classification === "internal"
  ) {
    return "internal";
  }

  if (
    REFERENCE_FILENAME_PATTERNS.some((pattern) => pattern.test(filename)) ||
    type === "reference" ||
    type === "setup" ||
    type === "workflow" ||
    contentKind === "reference" ||
    contentKind === "setup"
  ) {
    return "reference";
  }

  if (
    SAVED_ARTICLE_TYPES.has(type) ||
    SAVED_ARTICLE_TYPES.has(contentKind) ||
    contentKind === "article" ||
    contentKind === "essay"
  ) {
    return "savedArticle";
  }

  if (DAILY_BRIEF_TYPES.has(type) || contentKind === "daily-brief") {
    if (
      pathLower.startsWith("saved-articles/") ||
      subfolder === "saved-articles"
    ) {
      return "savedArticle";
    }

    return "dailyBrief";
  }

  if (pathLower.startsWith("daily/") || subfolder === "daily") {
    return "dailyBrief";
  }

  if (
    pathLower.startsWith("saved-articles/") ||
    subfolder === "saved-articles"
  ) {
    return "savedArticle";
  }

  // Root / other folders: content notes are saved articles, not setup.
  // Reference is reserved for explicit setup filenames/types above.
  if (pathSegments(relativePath).length >= 1) {
    return "savedArticle";
  }

  return "reference";
}

export function normalizeReadingBriefSourceTitle(title: string): string {
  const display = readingBriefDisplayTitle(title);
  const mapped = SOURCE_TITLE_MAP[normalizeKey(display)];

  if (mapped) {
    return mapped;
  }

  // Safe acronym fix: "Bbc World Service" → "BBC World Service"
  return display.replace(/\bBbc\b/g, "BBC").replace(/\bbbc\b/g, "BBC");
}

export function readingBriefSourceSlug(label: string): string {
  return normalizeKey(label)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve the publication/source label used to group daily briefs.
 * Priority: frontmatter → folder under daily/ → normalized title.
 */
export function resolveReadingBriefSourceLabel(
  note: LifeLabNoteSummary,
): string {
  const fromMeta =
    metadataString(note.metadata, "source") ||
    metadataString(note.metadata, "sourceName") ||
    metadataString(note.metadata, "source_name") ||
    metadataString(note.metadata, "publication") ||
    metadataString(note.metadata, "feedName") ||
    metadataString(note.metadata, "feed_name");

  if (fromMeta) {
    return normalizeReadingBriefSourceTitle(fromMeta);
  }

  const relativePath = normalizedRelativePath(note);
  const segments = pathSegments(relativePath);

  if (
    segments.length >= 3 &&
    segments[0]?.toLowerCase() === "daily" &&
    segments[1]
  ) {
    const folder = segments[1].replace(/[-_]+/g, " ");
    return normalizeReadingBriefSourceTitle(folder);
  }

  return normalizeReadingBriefSourceTitle(note.title);
}

export function readingBriefReferenceDisplayTitle(
  note: LifeLabNoteSummary,
): string {
  const relativePath = normalizedRelativePath(note);
  const stem = filenameStem(relativePath);
  const fromMap =
    REFERENCE_TITLE_MAP[stem] ?? REFERENCE_TITLE_MAP[normalizeKey(note.title)];

  if (fromMap) {
    return fromMap;
  }

  if (/workflow/i.test(stem) || /workflow/i.test(note.title)) {
    return "Daily brief workflow";
  }

  return readingBriefDisplayTitle(note.title);
}

export function readingBriefContentDateLabel(
  note: LifeLabNoteSummary,
  style: "weekday" | "short" | "long" = "short",
): string | null {
  const relativePath = normalizedRelativePath(note);
  const filename = relativePathFilename(relativePath);
  const datePrefix =
    parseDateFromFilename(filename) ??
    (note.metadata?.date && /^\d{4}-\d{2}-\d{2}$/.test(note.metadata.date)
      ? note.metadata.date
      : null);

  const iso = datePrefix ? `${datePrefix}T12:00:00Z` : note.modifiedAt;

  if (!iso) {
    return note.dateLabel ?? note.modifiedAtLabel;
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return note.dateLabel ?? note.modifiedAtLabel;
  }

  if (style === "weekday") {
    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  if (style === "long") {
    return new Intl.DateTimeFormat("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function readingBriefDailyListTitle(note: LifeLabNoteSummary): {
  primary: string;
  secondary: string;
} {
  const source = resolveReadingBriefSourceLabel(note);
  const weekday = readingBriefContentDateLabel(note, "weekday");
  const shortDate = readingBriefContentDateLabel(note, "short");

  return {
    primary: weekday ?? shortDate ?? source,
    secondary: weekday || shortDate ? source : note.title,
  };
}

export function readingBriefDedupeKey(note: LifeLabNoteSummary): string {
  if (note.fileId.trim()) {
    return `file:${note.fileId}`;
  }

  const relativePath =
    note.relativePath.trim() || slugToRelativePath(note.slug);

  if (relativePath) {
    return `path:${relativePath.toLowerCase()}`;
  }

  return `slug:${note.slug}`;
}

export function dedupeReadingBriefNotes(
  notes: LifeLabNoteSummary[],
): LifeLabNoteSummary[] {
  const seen = new Set<string>();
  const result: LifeLabNoteSummary[] = [];

  for (const note of notes) {
    const key = readingBriefDedupeKey(note);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(note);
  }

  return result;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function readingBriefMatchesDateFilter(
  note: LifeLabNoteSummary,
  filter: ReadingBriefDateFilter,
  now = new Date(),
): boolean {
  if (filter === "all") {
    return true;
  }

  const value = noteContentDateValue(note) || noteAddedDateValue(note);

  if (!value) {
    return false;
  }

  const noteDay = startOfLocalDay(new Date(value));
  const today = startOfLocalDay(now);

  if (filter === "week") {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    return noteDay.getTime() >= weekAgo.getTime();
  }

  return (
    noteDay.getFullYear() === today.getFullYear() &&
    noteDay.getMonth() === today.getMonth()
  );
}

export function sortReadingBriefNotes(
  notes: LifeLabNoteSummary[],
  sort: ReadingBriefArchiveSort,
): LifeLabNoteSummary[] {
  const sorted = [...notes];

  sorted.sort((left, right) => {
    switch (sort) {
      case "oldest": {
        const delta =
          (noteContentDateValue(left) || noteAddedDateValue(left)) -
          (noteContentDateValue(right) || noteAddedDateValue(right));

        if (delta !== 0) {
          return delta;
        }

        return left.title.localeCompare(right.title);
      }
      case "source": {
        const sourceDelta = resolveReadingBriefSourceLabel(left).localeCompare(
          resolveReadingBriefSourceLabel(right),
        );

        if (sourceDelta !== 0) {
          return sourceDelta;
        }

        return (
          (noteContentDateValue(right) || noteAddedDateValue(right)) -
          (noteContentDateValue(left) || noteAddedDateValue(left))
        );
      }
      case "title":
        return left.title.localeCompare(right.title);
      case "newest":
      default: {
        const delta =
          (noteContentDateValue(right) || noteAddedDateValue(right)) -
          (noteContentDateValue(left) || noteAddedDateValue(left));

        if (delta !== 0) {
          return delta;
        }

        return left.title.localeCompare(right.title);
      }
    }
  });

  return sorted;
}

export function groupDailyBriefsBySource(
  dailyNotes: LifeLabNoteSummary[],
  sort: ReadingBriefArchiveSort = "newest",
): ReadingBriefSourceCollection[] {
  const bySource = new Map<string, LifeLabNoteSummary[]>();

  for (const note of dailyNotes) {
    const label = resolveReadingBriefSourceLabel(note);
    const key = readingBriefSourceSlug(label);
    const bucket = bySource.get(key) ?? [];
    bucket.push(note);
    bySource.set(key, bucket);
  }

  const collections: ReadingBriefSourceCollection[] = [];

  for (const [sourceKey, sourceNotes] of bySource) {
    const sorted = sortReadingBriefNotes(sourceNotes, sort);
    const latestNote = sorted[0];

    if (!latestNote) {
      continue;
    }

    const sourceLabel = resolveReadingBriefSourceLabel(latestNote);

    collections.push({
      sourceKey,
      sourceLabel,
      count: sorted.length,
      latestNote,
      latestDateLabel: readingBriefContentDateLabel(latestNote, "weekday"),
      notes: sorted,
    });
  }

  collections.sort((left, right) => {
    const leftDate =
      noteContentDateValue(left.latestNote) ||
      noteAddedDateValue(left.latestNote);
    const rightDate =
      noteContentDateValue(right.latestNote) ||
      noteAddedDateValue(right.latestNote);

    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return left.sourceLabel.localeCompare(right.sourceLabel);
  });

  return collections;
}

export function formatDailyBriefCollectionMeta(
  collection: ReadingBriefSourceCollection,
): { primaryMeta: string; secondaryMeta: string | null } {
  const countLabel =
    collection.count === 1
      ? "1 daily brief"
      : `${collection.count} daily briefs`;

  return {
    primaryMeta: countLabel,
    secondaryMeta: collection.latestDateLabel
      ? `Latest ${collection.latestDateLabel}`
      : null,
  };
}

export type ReadingBriefArchiveModel = {
  dailyCollections: ReadingBriefSourceCollection[];
  activeCollection: ReadingBriefSourceCollection | null;
  savedArticles: LifeLabNoteSummary[];
  referenceNotes: LifeLabNoteSummary[];
  sources: string[];
  /** Flat daily notes (all sources) after filters — used for search hits. */
  dailyAll: LifeLabNoteSummary[];
};

function matchesSourceFilter(
  note: LifeLabNoteSummary,
  sourceFilter: string | null,
): boolean {
  if (!sourceFilter) {
    return true;
  }

  const filterSlug = readingBriefSourceSlug(sourceFilter);
  const labelSlug = readingBriefSourceSlug(
    resolveReadingBriefSourceLabel(note),
  );

  return (
    filterSlug === labelSlug ||
    normalizeKey(resolveReadingBriefSourceLabel(note)) ===
      normalizeKey(sourceFilter)
  );
}

export function buildReadingBriefArchive(
  notes: LifeLabNoteSummary[],
  options: {
    typeFilter?: ReadingBriefArchiveTypeFilter;
    sourceFilter?: string | null;
    dateFilter?: ReadingBriefDateFilter;
    sort?: ReadingBriefArchiveSort;
  } = {},
): ReadingBriefArchiveModel {
  const typeFilter = options.typeFilter ?? "all";
  const dateFilter = options.dateFilter ?? "all";
  const sourceFilter = options.sourceFilter?.trim() || null;
  const sort = options.sort ?? "newest";

  const allDeduped = dedupeReadingBriefNotes(notes).filter((note) => {
    const kind = classifyReadingBriefNote(note);
    return kind !== "internal";
  });

  const sources = [
    ...new Set(
      allDeduped
        .filter((note) => classifyReadingBriefNote(note) === "dailyBrief")
        .map(resolveReadingBriefSourceLabel),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const deduped = allDeduped.filter((note) => {
    const kind = classifyReadingBriefNote(note);

    if (typeFilter !== "all" && kind !== typeFilter) {
      return false;
    }

    if (kind === "dailyBrief" && !matchesSourceFilter(note, sourceFilter)) {
      return false;
    }

    if (!readingBriefMatchesDateFilter(note, dateFilter)) {
      return false;
    }

    return true;
  });

  const dailyAll = sortReadingBriefNotes(
    deduped.filter((note) => classifyReadingBriefNote(note) === "dailyBrief"),
    sort,
  );
  const savedArticles = sortReadingBriefNotes(
    deduped.filter((note) => classifyReadingBriefNote(note) === "savedArticle"),
    sort,
  );
  // Reference stays available even when viewing a source collection (landing only).
  const referenceNotes = sortReadingBriefNotes(
    allDeduped
      .filter((note) => classifyReadingBriefNote(note) === "reference")
      .filter((note) =>
        typeFilter === "all" || typeFilter === "reference"
          ? readingBriefMatchesDateFilter(note, dateFilter)
          : false,
      ),
    "title",
  );

  const dailyCollections = groupDailyBriefsBySource(dailyAll, sort);

  const activeCollection = sourceFilter
    ? (dailyCollections.find(
        (collection) =>
          collection.sourceKey === readingBriefSourceSlug(sourceFilter) ||
          normalizeKey(collection.sourceLabel) === normalizeKey(sourceFilter),
      ) ??
      (dailyCollections.length === 1 ? dailyCollections[0]! : null))
    : null;

  return {
    dailyCollections: sourceFilter ? [] : dailyCollections,
    activeCollection,
    savedArticles: sourceFilter ? [] : savedArticles,
    referenceNotes: sourceFilter ? [] : referenceNotes,
    sources,
    dailyAll,
  };
}

export function readingBriefSavedArticleTitle(note: LifeLabNoteSummary): string {
  return readingBriefDisplayTitle(note.title);
}
