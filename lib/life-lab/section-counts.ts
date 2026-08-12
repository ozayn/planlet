import type { LifeLabSectionId } from "@/lib/life-lab/constants";
import { LIFE_LAB_MAX_FILES_PER_SECTION } from "@/lib/life-lab/constants";
import {
  formatSectionContentMeta,
  type ContentCountType,
} from "@/lib/life-lab/collection-metadata";
import { buildNoteItemKey } from "@/lib/life-lab/item-key";
import { excludeArchivedByKey } from "@/lib/life-lab/item-state";

/** Prior hard ceiling that falsely capped YouTube Learning at 300 notes. */
export const LIFE_LAB_LEGACY_SECTION_FILE_CAP = 300;

export type CountableSectionNote = {
  relativePath: string;
  slug: string;
};

/**
 * Count notes from an already-loaded record list (e.g. browse payload).
 * Does not fetch Drive or parse files.
 */
export function countVisibleSectionNotes(
  sectionId: LifeLabSectionId,
  records: CountableSectionNote[],
  archivedKeys: ReadonlySet<string> = new Set(),
): number {
  const visible = excludeArchivedByKey(
    records,
    archivedKeys,
    (record) =>
      buildNoteItemKey({
        sectionId,
        relativePath: record.relativePath,
        slug: record.slug,
      }),
  );

  return visible.length;
}

/** Group already-loaded browse notes by section — O(n), no I/O. */
export function countBrowseNotesBySection(
  notes: ReadonlyArray<{ sectionId: LifeLabSectionId }>,
): Map<LifeLabSectionId, number> {
  const counts = new Map<LifeLabSectionId, number>();

  for (const note of notes) {
    counts.set(note.sectionId, (counts.get(note.sectionId) ?? 0) + 1);
  }

  return counts;
}

function contentTypeForSection(sectionId: LifeLabSectionId): ContentCountType {
  if (sectionId === "podcasts") {
    return "podcast";
  }

  return "note";
}

/**
 * Home section-card meta from browse data already on the page.
 * Flashcards deck/card totals require expensive parsing — omit them.
 */
export function homeSectionCardMeta(input: {
  sectionId: LifeLabSectionId;
  browseCounts: ReadonlyMap<LifeLabSectionId, number> | null;
}): string | undefined {
  if (input.sectionId === "flashcards") {
    return undefined;
  }

  if (!input.browseCounts) {
    return undefined;
  }

  return formatSectionContentMeta(
    input.browseCounts.get(input.sectionId) ?? 0,
    contentTypeForSection(input.sectionId),
  );
}

/** Guard: listings must not silently stop at the old 300-note ceiling. */
export function sectionListingLimitAllowsGrowthBeyondLegacyCap(
  maxFiles: number = LIFE_LAB_MAX_FILES_PER_SECTION,
): boolean {
  return maxFiles > LIFE_LAB_LEGACY_SECTION_FILE_CAP;
}

/** True when a path segment is an Ava/OpenClaw working folder that must not list. */
export function isLifeLabWorkingRelativePath(relativePath: string): boolean {
  return relativePath
    .replace(/\\/g, "/")
    .split("/")
    .some((segment) => segment.trim().toLowerCase() === "_working");
}

export function isLifeLabWorkingFolderName(folderName: string): boolean {
  return folderName.trim().toLowerCase() === "_working";
}
