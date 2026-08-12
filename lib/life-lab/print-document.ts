import type { LifeLabNote, LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { lifeLabNoteDisplayTitle } from "@/lib/life-lab/youtube-learning";

const PRINT_FILENAME_MAX_LEN = 120;
/** Characters that break Save-as-PDF / filesystem filenames. Keep Persian intact. */
const INVALID_FILENAME_CHARS = /[\u0000-\u001f<>:"/\\|?*]/g;

/**
 * Title precedence for PDF/print documents:
 * display_title → cleaned display title → note.title → H1 → cleaned slug.
 */
export function resolveLifeLabPrintDocumentTitle(
  note: Pick<LifeLabNote, "title" | "sectionId" | "slug"> & {
    metadata?: LifeLabNoteMetadata;
    relativePath?: string;
    subfolderLabel?: string | null;
  },
  options?: {
    h1?: string | null;
  },
): string {
  const displayTitle = note.metadata?.display_title?.trim();
  if (displayTitle) {
    return displayTitle;
  }

  const cleanedDisplay = lifeLabNoteDisplayTitle(note)?.trim();
  if (cleanedDisplay) {
    return cleanedDisplay;
  }

  const title = note.title?.trim();
  if (title) {
    return title;
  }

  const h1 = options?.h1?.trim();
  if (h1) {
    return h1;
  }

  const fromSlug = cleanLifeLabSlugForPrintFilename(note.slug);
  if (fromSlug) {
    return fromSlug;
  }

  return "Note";
}

/** Turn a Life Lab slug into a readable filename stem (never a bare video id). */
export function cleanLifeLabSlugForPrintFilename(
  slug: string | null | undefined,
): string {
  if (!slug?.trim()) {
    return "";
  }

  const cleaned = slug
    .trim()
    .replace(/__/g, " - ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Reject opaque ids (11-char YouTube-like tokens, long hex).
  if (/^[A-Za-z0-9_-]{11}$/.test(cleaned.replace(/\s/g, ""))) {
    return "";
  }

  if (/^[a-f0-9]{16,}$/i.test(cleaned.replace(/\s/g, ""))) {
    return "";
  }

  return cleaned;
}

export function sanitizeLifeLabPrintFilenameStem(title: string): string {
  const cleaned = title
    .replace(INVALID_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Note";
  }

  if (cleaned.length <= PRINT_FILENAME_MAX_LEN) {
    return cleaned;
  }

  return `${cleaned.slice(0, PRINT_FILENAME_MAX_LEN - 1).trimEnd()}…`;
}

/**
 * Browser Save as PDF typically uses `document.title` as the suggested filename.
 */
export function buildLifeLabPrintWindowTitle(noteTitle: string): string {
  const stem = sanitizeLifeLabPrintFilenameStem(noteTitle);
  return `Life Lab - ${stem}`;
}

export function resolveLifeLabPrintSubtitle(input: {
  metadata?: LifeLabNoteMetadata;
  sectionLabel?: string | null;
  channelLabel?: string | null;
  sourceLabel?: string | null;
}): string | null {
  const parts = [
    input.channelLabel?.trim(),
    input.sourceLabel?.trim(),
    input.sectionLabel?.trim(),
  ].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  // Prefer the most specific label; avoid repeating identical tokens.
  const unique = [...new Set(parts)];
  return unique[0] ?? null;
}

export function resolveLifeLabPrintDateLabel(
  note: Pick<LifeLabNote, "dateLabel" | "modifiedAtLabel">,
): string | null {
  return note.dateLabel?.trim() || note.modifiedAtLabel?.trim() || null;
}

export function lifeLabNotePrintHref(input: {
  sectionId: string;
  slug: string;
}): string {
  return `/life-lab/${input.sectionId}/${input.slug}?view=print`;
}

export function lifeLabNoteOverviewHref(input: {
  sectionId: string;
  slug: string;
}): string {
  return `/life-lab/${input.sectionId}/${input.slug}`;
}
