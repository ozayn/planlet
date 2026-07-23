import type {
  LifeLabBrowseNote,
  LifeLabFlashcard,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  getLifeLabSectionLabel,
  isLifeLabSectionId,
  sectionIdFromFolderName,
} from "@/lib/life-lab/sections";
import {
  detectDeckLanguage,
  parseMemoNextDeck,
  type MemoNextParseIssue,
} from "@/lib/life-lab/memonext-deck";
import { extractFlashcardsFromMarkdown } from "@/lib/life-lab/flashcards";
import {
  driveRelativePathToSlug,
  relativePathFilename,
  titleFromFilename,
} from "@/lib/life-lab/slug";
import { countPersianArabicChars, countLatinChars } from "@/lib/text-direction";

export type FlashcardDeckSourceKind =
  | "youtube"
  | "podcasts"
  | "references"
  | "topics"
  | "lectures"
  | "bbc"
  | "other";

export type FlashcardDeckLanguage = "english" | "persian" | "mixed";

export type FlashcardDeckSummary = {
  id: string;
  slug: string;
  title: string;
  sourceKind: FlashcardDeckSourceKind;
  category: string | null;
  sourceLabel: string | null;
  language: FlashcardDeckLanguage;
  cardCount: number;
  modifiedAt: string | null;
  modifiedAtLabel: string | null;
  sourceNoteHref: string | null;
  sourceNoteTitle: string | null;
  sourceSectionId: LifeLabSectionId | null;
  tags: string[];
  searchText: string;
  parseIssues: MemoNextParseIssue[];
  cards: LifeLabFlashcard[];
  origin: "dedicated" | "embedded" | "reference";
};

export type FlashcardDeckFilters = {
  sourceKind?: FlashcardDeckSourceKind | "all";
  language?: FlashcardDeckLanguage | "all";
  q?: string;
  sort?: "newest" | "alphabetical" | "most-cards" | "recently-viewed";
};

const BLOCKED_FLASHCARD_FOLDER_NAMES = new Set([
  "private",
  "working",
  "work",
  "raw",
  "transcripts",
  "transcript",
  "chunks",
  "drafts",
  "draft",
  "logs",
  "log",
  "tmp",
  "temp",
  "archive",
]);

const SOURCE_KIND_ALIASES: Record<string, FlashcardDeckSourceKind> = {
  youtube: "youtube",
  "youtube-learning": "youtube",
  podcasts: "podcasts",
  podcast: "podcasts",
  references: "references",
  reference: "references",
  topics: "topics",
  topic: "topics",
  lectures: "lectures",
  lecture: "lectures",
  "lecture-notes": "lectures",
  bbc: "bbc",
};

export function isFlashcardBlockedFolder(folderName: string): boolean {
  return BLOCKED_FLASHCARD_FOLDER_NAMES.has(folderName.trim().toLowerCase());
}

export function isFlashcardVisibleRelativePath(relativePath: string): boolean {
  const segments = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);

  if (segments.some((segment) => isFlashcardBlockedFolder(segment))) {
    return false;
  }

  const filename = segments.at(-1)?.toLowerCase() ?? "";
  return (
    filename.endsWith(".txt") ||
    filename.endsWith(".md") ||
    filename.endsWith(".deck")
  );
}

export function resolveFlashcardSourceKind(input: {
  relativePath?: string | null;
  category?: string | null;
  sectionId?: LifeLabSectionId | null;
  source?: string | null;
}): FlashcardDeckSourceKind {
  const path = (input.relativePath ?? "").replace(/\\/g, "/").toLowerCase();
  const segments = path.split("/").filter(Boolean);

  for (const segment of segments) {
    const mapped = SOURCE_KIND_ALIASES[segment];
    if (mapped) {
      return mapped;
    }
  }

  const category = input.category?.trim().toLowerCase() ?? "";
  if (category && SOURCE_KIND_ALIASES[category]) {
    return SOURCE_KIND_ALIASES[category];
  }

  if (input.sectionId === "youtube-learning") {
    return "youtube";
  }

  if (input.sectionId === "podcasts") {
    return "podcasts";
  }

  if (input.sectionId === "lecture-notes") {
    return "lectures";
  }

  if (input.sectionId === "learning-map") {
    return "topics";
  }

  const source = input.source?.trim().toLowerCase() ?? "";
  if (source.includes("bbc")) {
    return "bbc";
  }

  if (source.includes("youtube")) {
    return "youtube";
  }

  return "other";
}

export function flashcardSourceKindLabel(
  kind: FlashcardDeckSourceKind,
): string {
  switch (kind) {
    case "youtube":
      return "YouTube";
    case "podcasts":
      return "Podcasts";
    case "references":
      return "References";
    case "topics":
      return "Topics";
    case "lectures":
      return "Lectures";
    case "bbc":
      return "BBC";
    default:
      return "Other";
  }
}

/** Deterministic title cleaning for search indexing (mirrors display-title rules). */
export function cleanedFlashcardTitleForSearch(title: string): string {
  return (
    title
      .replace(/\s*[–—-]\s*\d{4}-\d{2}-\d{2}\s*$/, "")
      .replace(/\bBBC World Service\b/gi, "BBC")
      .trim() || title.trim()
  );
}

/** Singular/concise labels for deck cards (filters keep plural forms). */
export function flashcardSourceKindCardLabel(
  kind: FlashcardDeckSourceKind,
): string {
  switch (kind) {
    case "youtube":
      return "YouTube";
    case "podcasts":
      return "Podcast";
    case "references":
      return "Reference";
    case "topics":
      return "Topic";
    case "lectures":
      return "Lecture";
    case "bbc":
      return "BBC";
    default:
      return "Other";
  }
}

function buildSearchText(input: {
  title: string;
  displayTitle?: string | null;
  category?: string | null;
  sourceLabel?: string | null;
  sourceNoteTitle?: string | null;
  tags?: string[];
  cards: LifeLabFlashcard[];
}): string {
  return [
    input.title,
    input.displayTitle,
    input.category,
    input.sourceLabel,
    input.sourceNoteTitle,
    ...(input.tags ?? []),
    ...input.cards.flatMap((card) => [
      card.question,
      card.answer,
      card.example,
      card.context,
    ]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function buildFlashcardDeckFromContent(input: {
  slug: string;
  relativePath: string;
  titleFallback: string;
  content: string;
  modifiedAt?: string | null;
  modifiedAtLabel?: string | null;
  origin?: FlashcardDeckSummary["origin"];
  sourceSectionId?: LifeLabSectionId | null;
  sourceNoteHref?: string | null;
  sourceNoteTitle?: string | null;
}): FlashcardDeckSummary {
  const parsed = parseMemoNextDeck(input.content);
  const cards =
    parsed.cards.length > 0
      ? parsed.cards
      : extractFlashcardsFromMarkdown(input.content);
  const title =
    parsed.headers.title?.trim() ||
    input.sourceNoteTitle?.trim() ||
    input.titleFallback;
  const sourceKind = resolveFlashcardSourceKind({
    relativePath: input.relativePath,
    category: parsed.headers.category,
    sectionId: input.sourceSectionId,
    source: parsed.headers.source,
  });
  const language =
    (parsed.headers.language?.toLowerCase() as FlashcardDeckLanguage | undefined) &&
    ["english", "persian", "mixed"].includes(
      parsed.headers.language!.toLowerCase(),
    )
      ? (parsed.headers.language!.toLowerCase() as FlashcardDeckLanguage)
      : detectDeckLanguage(cards);
  const resolvedSource =
    input.sourceNoteHref && input.sourceNoteTitle
      ? {
          href: input.sourceNoteHref,
          displayTitle: input.sourceNoteTitle,
          sectionId: input.sourceSectionId ?? null,
        }
      : parsed.headers.lifeLabNote
        ? resolveLifeLabNoteHref({
            fromSectionId: input.sourceSectionId ?? "flashcards",
            fromRelativePath: input.relativePath,
            referencedPath: parsed.headers.lifeLabNote,
          })
        : null;

  return {
    id: input.slug,
    slug: input.slug,
    title,
    sourceKind,
    category: parsed.headers.category ?? null,
    sourceLabel: parsed.headers.source ?? null,
    language,
    cardCount: cards.length,
    modifiedAt: input.modifiedAt ?? null,
    modifiedAtLabel: input.modifiedAtLabel ?? null,
    sourceNoteHref: resolvedSource?.href ?? input.sourceNoteHref ?? null,
    sourceNoteTitle:
      resolvedSource && "displayTitle" in resolvedSource
        ? resolvedSource.displayTitle
        : (input.sourceNoteTitle ?? null),
    sourceSectionId:
      resolvedSource && "sectionId" in resolvedSource
        ? resolvedSource.sectionId
        : (input.sourceSectionId ?? null),
    tags: parsed.headers.tags ?? [],
    searchText: buildSearchText({
      title,
      displayTitle: cleanedFlashcardTitleForSearch(title),
      category: parsed.headers.category,
      sourceLabel: parsed.headers.source,
      sourceNoteTitle: input.sourceNoteTitle,
      tags: parsed.headers.tags,
      cards,
    }),
    parseIssues: parsed.issues,
    cards,
    origin: input.origin ?? "dedicated",
  };
}

export function buildEmbeddedFlashcardDeck(input: {
  note: Pick<
    LifeLabNoteSummary,
    | "slug"
    | "title"
    | "relativePath"
    | "modifiedAt"
    | "modifiedAtLabel"
    | "metadata"
    | "flashcardCount"
    | "hasFlashcards"
  > & {
    sectionId: LifeLabSectionId;
    sectionLabel?: string;
  };
  cards: LifeLabFlashcard[];
}): FlashcardDeckSummary | null {
  if (input.cards.length === 0) {
    return null;
  }

  const sourceKind = resolveFlashcardSourceKind({
    relativePath: input.note.relativePath,
    category: input.note.metadata?.category,
    sectionId: input.note.sectionId,
    source: input.note.metadata?.source,
  });
  const language = detectDeckLanguage(input.cards);
  const title = `${input.note.title}`;

  return {
    id: `${input.note.sectionId}__${input.note.slug}`,
    slug: `${input.note.sectionId}__${input.note.slug}`,
    title,
    sourceKind,
    category: input.note.metadata?.category ?? null,
    sourceLabel: input.note.metadata?.source ?? null,
    language,
    cardCount: input.cards.length,
    modifiedAt: input.note.modifiedAt,
    modifiedAtLabel: input.note.modifiedAtLabel,
    sourceNoteHref: `/life-lab/${input.note.sectionId}/${input.note.slug}`,
    sourceNoteTitle: input.note.title,
    sourceSectionId: input.note.sectionId,
    tags: input.note.metadata?.tags ?? [],
    searchText: buildSearchText({
      title,
      displayTitle: cleanedFlashcardTitleForSearch(title),
      category: input.note.metadata?.category,
      sourceLabel: input.note.metadata?.source,
      sourceNoteTitle: input.note.title,
      tags: input.note.metadata?.tags,
      cards: input.cards,
    }),
    parseIssues: [],
    cards: input.cards,
    origin: "embedded",
  };
}

export function filterFlashcardDecks(
  decks: FlashcardDeckSummary[],
  filters: FlashcardDeckFilters,
  recentIds: string[] = [],
): FlashcardDeckSummary[] {
  const query = filters.q?.trim().toLowerCase() ?? "";
  let next = decks.filter((deck) => deck.cardCount > 0 || deck.parseIssues.length > 0);

  if (filters.sourceKind && filters.sourceKind !== "all") {
    next = next.filter((deck) => deck.sourceKind === filters.sourceKind);
  }

  if (filters.language && filters.language !== "all") {
    next = next.filter((deck) => deck.language === filters.language);
  }

  if (query) {
    next = next.filter((deck) => deck.searchText.includes(query));
  }

  const sort = filters.sort ?? "newest";

  next = [...next].sort((left, right) => {
    switch (sort) {
      case "alphabetical":
        return left.title.localeCompare(right.title);
      case "most-cards":
        return right.cardCount - left.cardCount;
      case "recently-viewed": {
        const leftIndex = recentIds.indexOf(left.id);
        const rightIndex = recentIds.indexOf(right.id);
        if (leftIndex === -1 && rightIndex === -1) {
          return (right.modifiedAt ?? "").localeCompare(left.modifiedAt ?? "");
        }
        if (leftIndex === -1) {
          return 1;
        }
        if (rightIndex === -1) {
          return -1;
        }
        return leftIndex - rightIndex;
      }
      case "newest":
      default:
        return (right.modifiedAt ?? "").localeCompare(left.modifiedAt ?? "");
    }
  });

  return next;
}

export function collectEmbeddedDecksFromBrowseNotes(
  notes: LifeLabBrowseNote[],
  cardsByNoteKey: Map<string, LifeLabFlashcard[]>,
): FlashcardDeckSummary[] {
  const decks: FlashcardDeckSummary[] = [];

  for (const note of notes) {
    if (!note.hasFlashcards || !note.flashcardCount) {
      continue;
    }

    const key = `${note.sectionId}:${note.slug}`;
    const cards = cardsByNoteKey.get(key) ?? [];

    if (cards.length === 0) {
      continue;
    }

    const deck = buildEmbeddedFlashcardDeck({
      note: {
        ...note,
        sectionLabel: note.sectionLabel ?? getLifeLabSectionLabel(note.sectionId),
      },
      cards,
    });

    if (deck) {
      decks.push(deck);
    }
  }

  return decks;
}

export function inferLanguageFromText(text: string): FlashcardDeckLanguage {
  const persian = countPersianArabicChars(text);
  const latin = countLatinChars(text);

  if (persian > 0 && latin > 0) {
    return "mixed";
  }

  if (persian > 0) {
    return "persian";
  }

  return "english";
}

function normalizePathSegments(parts: string[]): string[] {
  const stack: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      stack.pop();
      continue;
    }

    stack.push(part);
  }

  return stack;
}

/**
 * Resolve a MemoNext LIFE_LAB_NOTE (or frontmatter deck/note path) to a
 * Planlet href without exposing filesystem paths.
 */
export function resolveLifeLabNoteHref(input: {
  fromSectionId?: LifeLabSectionId | null;
  fromRelativePath?: string | null;
  referencedPath: string;
}): {
  href: string;
  sectionId: LifeLabSectionId;
  slug: string;
  displayTitle: string;
} | null {
  const raw = input.referencedPath.trim().replace(/\\/g, "/");

  if (!raw || raw.startsWith("/") || /^[a-z]+:/i.test(raw)) {
    return null;
  }

  const cleaned = raw.replace(/^(\.\/)+/, "").replace(/^life-lab\//i, "");
  const directSection = sectionIdFromFolderName(cleaned.split("/")[0] ?? "");

  let resolved: string[];

  if (directSection && cleaned.includes("/")) {
    resolved = normalizePathSegments(cleaned.split("/"));
  } else {
    const baseParts = [
      input.fromSectionId ?? "flashcards",
      ...(input.fromRelativePath
        ? input.fromRelativePath.replace(/\\/g, "/").split("/").slice(0, -1)
        : []),
    ];
    resolved = normalizePathSegments([...baseParts, ...cleaned.split("/")]);

    // Paths like ../learning-map/... from a nested flashcards deck can leave a
    // stray "flashcards/" prefix before the real section folder.
    if (
      resolved[0] === "flashcards" &&
      resolved[1] &&
      sectionIdFromFolderName(resolved[1]!)
    ) {
      resolved = resolved.slice(1);
    }
  }

  if (resolved.length < 2) {
    return null;
  }

  const folderName = resolved[0]!;
  const sectionId = sectionIdFromFolderName(folderName);

  if (!sectionId || !isLifeLabSectionId(sectionId)) {
    return null;
  }

  const withinSection = resolved.slice(1).join("/");
  const slug = driveRelativePathToSlug(withinSection);
  const displayTitle = titleFromFilename(relativePathFilename(withinSection));

  return {
    href: `/life-lab/${sectionId}/${slug}`,
    sectionId,
    slug,
    displayTitle,
  };
}

export function flashcardDeckLanguageLabel(
  language: FlashcardDeckLanguage,
): string {
  switch (language) {
    case "persian":
      return "Persian";
    case "mixed":
      return "Mixed";
    default:
      return "English";
  }
}
