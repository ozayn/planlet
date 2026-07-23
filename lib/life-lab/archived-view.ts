import { isLifeLabSectionId } from "@/lib/life-lab/sections";
import { getLifeLabSectionLabel } from "@/lib/life-lab/sections";
import type { ArchivedLifeLabItem } from "@/lib/life-lab/item-state";
import {
  buildFlashcardDeckItemKey,
  buildNoteItemKey,
  type LifeLabItemType,
} from "@/lib/life-lab/item-key";
import type { FlashcardDeckSummary } from "@/lib/life-lab/flashcard-decks";
import type { LifeLabBrowseNote } from "@/lib/life-lab/constants";

export type ArchivedLifeLabListItem = {
  itemKey: string;
  section: string;
  sectionLabel: string;
  itemType: string;
  title: string;
  href: string;
  archivedAt: Date;
  archivedAtLabel: string;
  meta: string | null;
};

function formatArchivedAt(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function hrefForItem(item: ArchivedLifeLabItem): string {
  if (item.itemType === "flashcard-deck" || item.section === "flashcards") {
    const slug = item.itemKey.replace(/^flashcards:/, "");
    return `/life-lab/flashcards/${slug}`;
  }

  const withoutSection = item.itemKey.startsWith(`${item.section}:`)
    ? item.itemKey.slice(item.section.length + 1)
    : item.itemKey;
  const slug = withoutSection.replace(/:/g, "__");
  return `/life-lab/${item.section}/${slug}`;
}

function titleFallback(item: ArchivedLifeLabItem): string {
  const withoutSection = item.itemKey.startsWith(`${item.section}:`)
    ? item.itemKey.slice(item.section.length + 1)
    : item.itemKey;
  return withoutSection.split(":").at(-1)?.replace(/-/g, " ") || item.itemKey;
}

export function enrichArchivedLifeLabItems(input: {
  archived: ArchivedLifeLabItem[];
  decks?: FlashcardDeckSummary[];
  notes?: LifeLabBrowseNote[];
}): ArchivedLifeLabListItem[] {
  const deckByKey = new Map(
    (input.decks ?? []).map((deck) => [
      buildFlashcardDeckItemKey(deck.slug),
      deck,
    ]),
  );
  const noteByKey = new Map(
    (input.notes ?? []).map((note) => [
      buildNoteItemKey({
        sectionId: note.sectionId,
        relativePath: note.relativePath,
        slug: note.slug,
      }),
      note,
    ]),
  );

  return input.archived.map((item) => {
    const deck = deckByKey.get(item.itemKey);
    const note = noteByKey.get(item.itemKey);
    const sectionLabel = isLifeLabSectionId(item.section)
      ? getLifeLabSectionLabel(item.section)
      : item.section;
    const title = deck?.title || note?.title || titleFallback(item);
    const href = deck
      ? `/life-lab/flashcards/${deck.slug}`
      : note
        ? `/life-lab/${note.sectionId}/${note.slug}`
        : hrefForItem(item);
    const meta = deck
      ? `${deck.cardCount} cards`
      : note?.dateLabel || note?.modifiedAtLabel || null;

    return {
      itemKey: item.itemKey,
      section: item.section,
      sectionLabel,
      itemType: item.itemType,
      title,
      href,
      archivedAt: item.archivedAt,
      archivedAtLabel: formatArchivedAt(item.archivedAt),
      meta,
    };
  });
}

export function filterArchivedListItems(
  items: ArchivedLifeLabListItem[],
  filters: {
    section?: string | "all";
    q?: string;
    sort?: "recent" | "title" | "original";
  },
): ArchivedLifeLabListItem[] {
  let next = items;

  if (filters.section && filters.section !== "all") {
    next = next.filter((item) => item.section === filters.section);
  }

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    next = next.filter((item) =>
      [item.title, item.sectionLabel, item.itemType, item.meta]
        .filter(Boolean)
        .join("\n")
        .toLowerCase()
        .includes(q),
    );
  }

  const sort = filters.sort ?? "recent";
  next = [...next].sort((a, b) => {
    if (sort === "title") {
      return a.title.localeCompare(b.title);
    }
    if (sort === "original") {
      return (a.meta ?? "").localeCompare(b.meta ?? "");
    }
    return b.archivedAt.getTime() - a.archivedAt.getTime();
  });

  return next;
}

export type { LifeLabItemType };
