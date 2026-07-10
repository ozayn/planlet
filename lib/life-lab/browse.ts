import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  resolveStudyStatusValue,
  type LifeLabStudyStatus,
} from "@/lib/life-lab/study-status";
import {
  parseDateFromFilename,
  relativePathFilename,
  slugToRelativePath,
} from "@/lib/life-lab/slug";

export const LIFE_LAB_SORT_KEYS = [
  "newest",
  "oldest",
  "title",
  "status",
  "recent",
] as const;

export type LifeLabSortKey = (typeof LIFE_LAB_SORT_KEYS)[number];

export const LIFE_LAB_DEFAULT_SORT: LifeLabSortKey = "newest";

export const LIFE_LAB_SORT_LABELS: Record<LifeLabSortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title",
  status: "Study status",
  recent: "Recently added",
};

export const LIFE_LAB_SORT_SHORT_LABELS: Record<LifeLabSortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  title: "Title",
  status: "Status",
  recent: "Recent",
};

export function isLifeLabSortKey(value: string): value is LifeLabSortKey {
  return (LIFE_LAB_SORT_KEYS as readonly string[]).includes(value);
}

// Content date: filename/frontmatter date preferred over Drive modified time.
export function noteContentDateValue(note: LifeLabNoteSummary): number {
  const filename = relativePathFilename(
    note.relativePath || slugToRelativePath(note.slug),
  );
  const datePrefix =
    parseDateFromFilename(filename) ??
    (note.metadata?.date && /^\d{4}-\d{2}-\d{2}$/.test(note.metadata.date)
      ? note.metadata.date
      : null);

  if (datePrefix) {
    return new Date(`${datePrefix}T12:00:00Z`).getTime();
  }

  if (note.modifiedAt) {
    return new Date(note.modifiedAt).getTime();
  }

  return 0;
}

// Added date: Drive modified time preferred (recently synced/added notes first).
export function noteAddedDateValue(note: LifeLabNoteSummary): number {
  if (note.modifiedAt) {
    return new Date(note.modifiedAt).getTime();
  }

  return noteContentDateValue(note);
}

const STATUS_SORT_ORDER: Record<LifeLabStudyStatus, number> = {
  studying: 0,
  revisit: 1,
  new: 2,
  reviewed: 3,
  learned: 4,
};

function statusSortValue(note: LifeLabNoteSummary): number {
  const status = resolveStudyStatusValue(note.metadata);

  return status !== null ? STATUS_SORT_ORDER[status] : 5;
}

export function compareLifeLabNotes(
  left: LifeLabNoteSummary,
  right: LifeLabNoteSummary,
  sort: LifeLabSortKey,
): number {
  switch (sort) {
    case "oldest": {
      const delta = noteContentDateValue(left) - noteContentDateValue(right);
      return delta !== 0 ? delta : left.title.localeCompare(right.title);
    }
    case "title":
      return left.title.localeCompare(right.title);
    case "status": {
      const delta = statusSortValue(left) - statusSortValue(right);
      return delta !== 0
        ? delta
        : noteContentDateValue(right) - noteContentDateValue(left);
    }
    case "recent": {
      const delta = noteAddedDateValue(right) - noteAddedDateValue(left);
      return delta !== 0 ? delta : left.title.localeCompare(right.title);
    }
    case "newest":
    default: {
      const delta = noteContentDateValue(right) - noteContentDateValue(left);
      return delta !== 0 ? delta : left.title.localeCompare(right.title);
    }
  }
}

export function sortLifeLabNotes(
  notes: LifeLabNoteSummary[],
  sort: LifeLabSortKey,
): LifeLabNoteSummary[] {
  return [...notes].sort((left, right) =>
    compareLifeLabNotes(left, right, sort),
  );
}

export function noteMonthKey(note: LifeLabNoteSummary): string | null {
  const value = noteContentDateValue(note);

  if (value === 0) {
    return null;
  }

  const date = new Date(value);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${date.getUTCFullYear()}-${month}`;
}

export function monthKeyLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");

  if (!year || !month) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${year}-${month}-15T12:00:00Z`));
}

export type LifeLabHighlights = {
  latest: LifeLabNoteSummary[];
  continueStudying: LifeLabNoteSummary[];
  recentlyAdded: LifeLabNoteSummary[];
};

export const LIFE_LAB_HIGHLIGHTS_MIN_NOTES = 10;

const CONTINUE_STATUSES: LifeLabStudyStatus[] = ["studying", "revisit"];

function isReferenceLikeNote(note: LifeLabNoteSummary): boolean {
  return !note.subfolderLabel && !note.metadata?.playlist?.trim();
}

export function buildLifeLabHighlights(
  notes: LifeLabNoteSummary[],
  limit = 3,
): LifeLabHighlights {
  const contentNotes = notes.filter((note) => !isReferenceLikeNote(note));
  const pool = contentNotes.length > 0 ? contentNotes : notes;

  const latest = sortLifeLabNotes(pool, "newest").slice(0, limit);
  const latestSlugs = new Set(latest.map((note) => note.slug));

  const continueStudying = sortLifeLabNotes(
    pool.filter((note) => {
      const status = resolveStudyStatusValue(note.metadata);
      return status !== null && CONTINUE_STATUSES.includes(status);
    }),
    "newest",
  ).slice(0, limit);

  const recentlyAdded = sortLifeLabNotes(pool, "recent")
    .filter((note) => !latestSlugs.has(note.slug))
    .slice(0, limit);

  return { latest, continueStudying, recentlyAdded };
}

export function shouldShowLifeLabHighlights(
  noteCount: number,
  hasActiveQuery: boolean,
): boolean {
  return !hasActiveQuery && noteCount >= LIFE_LAB_HIGHLIGHTS_MIN_NOTES;
}
