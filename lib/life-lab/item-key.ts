/**
 * Per-user Life Lab item state (archive, etc.).
 * Source Markdown/Drive files are never modified.
 */

export type LifeLabItemType =
  | "note"
  | "flashcard-deck"
  | "podcast-show"
  | "podcast-episode"
  | "dictionary-entry"
  | "playlist"
  | "other";

export type LifeLabItemKeyInput = {
  section: string;
  /** Drive-relative path preferred; slug accepted as fallback. */
  relativePath?: string | null;
  slug?: string | null;
  itemType?: LifeLabItemType;
};

/** Normalize a path or slug into stable colon-separated identity segments. */
export function normalizeLifeLabIdentityPath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.(md|txt|deck)$/i, "")
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(":");
}

/**
 * Stable archive key. Prefer section + relative path (extension stripped).
 * Examples:
 * - flashcards:bbc-world-service-daily-brief-2026-07-23
 * - youtube-learning:2026-07-19-fifa-covering-for-dictators
 * - learning-dictionary:english:phrases:sportswashing
 * - podcasts:the-daily:2026-07-18-episode
 */
export function buildLifeLabItemKey(input: LifeLabItemKeyInput): string {
  const section = input.section.trim().toLowerCase();
  const raw = (input.relativePath?.trim() || input.slug?.trim() || "").trim();
  if (!section || !raw) {
    throw new Error("Life Lab itemKey requires section and path or slug.");
  }

  const identity = normalizeLifeLabIdentityPath(raw);
  if (!identity) {
    throw new Error("Life Lab itemKey identity is empty.");
  }

  // Avoid duplicating the section prefix when relativePath already includes it.
  if (identity === section || identity.startsWith(`${section}:`)) {
    return identity;
  }

  return `${section}:${identity}`;
}

export function buildFlashcardDeckItemKey(deckSlug: string): string {
  return buildLifeLabItemKey({
    section: "flashcards",
    slug: deckSlug,
    itemType: "flashcard-deck",
  });
}

export function buildNoteItemKey(input: {
  sectionId: string;
  relativePath?: string | null;
  slug: string;
}): string {
  return buildLifeLabItemKey({
    section: input.sectionId,
    relativePath: input.relativePath,
    slug: input.slug,
    itemType:
      input.sectionId === "learning-dictionary"
        ? "dictionary-entry"
        : "note",
  });
}

export function buildPodcastShowItemKey(showSlug: string): string {
  return buildLifeLabItemKey({
    section: "podcasts",
    slug: `show:${showSlug}`,
    itemType: "podcast-show",
  });
}

export function buildPodcastEpisodeItemKey(input: {
  relativePath?: string | null;
  slug: string;
}): string {
  return buildLifeLabItemKey({
    section: "podcasts",
    relativePath: input.relativePath,
    slug: input.slug,
    itemType: "podcast-episode",
  });
}

export function parseLifeLabItemKeySection(itemKey: string): string | null {
  const section = itemKey.split(":")[0]?.trim();
  return section || null;
}
