import type { LifeLabNote, LifeLabNoteMetadata } from "@/lib/life-lab/constants";
import { lifeLabNoteDisplayTitle } from "@/lib/life-lab/youtube-learning";

/**
 * Title precedence for PDF/print documents:
 * display_title → cleaned display title → note.title (H1/filename already resolved upstream).
 */
export function resolveLifeLabPrintDocumentTitle(
  note: Pick<
    LifeLabNote,
    "title" | "sectionId" | "metadata" | "relativePath" | "subfolderLabel"
  >,
): string {
  const displayTitle = note.metadata?.display_title?.trim();
  if (displayTitle) {
    return displayTitle;
  }

  return lifeLabNoteDisplayTitle(note);
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
