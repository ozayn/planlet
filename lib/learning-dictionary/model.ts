import type {
  LifeLabFlashcard,
  LifeLabNote,
  LifeLabNoteMetadata,
  LifeLabNoteSummary,
} from "@/lib/life-lab/constants";
import {
  dictionaryCategoryLabel,
  dictionaryDisplayTitle,
  extractDictionaryDefinition,
  isDictionaryEntryNote,
  isDictionaryReferenceNote,
  resolveDictionaryCategory,
  resolveDictionaryEntryType,
  resolveDictionaryLanguage,
  type DictionaryEntryTypeId,
  type DictionaryLanguageId,
} from "@/lib/life-lab/learning-dictionary";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import {
  resolveStudyStatusLabel,
  resolveStudyStatusValue,
  type LifeLabStudyStatus,
} from "@/lib/life-lab/study-status";
import { normalizeSearchText } from "@/lib/text-direction";

export const LEARNING_DICTIONARY_SECTION_ID = "learning-dictionary" as const;

export const DICTIONARY_CATEGORY_CHIPS = [
  { id: "all", label: "All" },
  { id: "english", label: "English" },
  { id: "persian", label: "Persian" },
  { id: "concepts", label: "Concepts" },
  { id: "people", label: "People" },
  { id: "places", label: "Places" },
  { id: "organizations", label: "Organizations" },
  { id: "films", label: "Films" },
  { id: "books", label: "Books" },
  { id: "art", label: "Art" },
  { id: "events", label: "Events" },
] as const;

export const DICTIONARY_LANGUAGE_CHIPS = [
  { id: "all", label: "All" },
  { id: "english", label: "English" },
  { id: "persian", label: "Persian" },
] as const;

export const DICTIONARY_STATUS_CHIPS = [
  { id: "new", label: "New" },
  { id: "studying", label: "Studying" },
  { id: "learned", label: "Learned" },
  { id: "all", label: "All" },
] as const;

export const DICTIONARY_SORT_KEYS = [
  "newest",
  "encounters",
  "alpha",
  "updated",
  "status",
] as const;

export type DictionarySortKey = (typeof DICTIONARY_SORT_KEYS)[number];

export const DICTIONARY_SORT_LABELS: Record<DictionarySortKey, string> = {
  newest: "Newest",
  encounters: "Most encountered",
  alpha: "Alphabetical",
  updated: "Recently updated",
  status: "Review status",
};

export type DictionaryCategoryChipId =
  (typeof DICTIONARY_CATEGORY_CHIPS)[number]["id"];
export type DictionaryLanguageChipId =
  (typeof DICTIONARY_LANGUAGE_CHIPS)[number]["id"];
export type DictionaryStatusChipId =
  (typeof DICTIONARY_STATUS_CHIPS)[number]["id"];

export type DictionaryCardModel = {
  slug: string;
  title: string;
  href: string;
  typeId: DictionaryEntryTypeId | null;
  typeLabel: string | null;
  languageId: DictionaryLanguageId | null;
  languageLabel: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  tags: string[];
  definition: string;
  occurrences: number | null;
  reviewStatus: LifeLabStudyStatus | null;
  reviewStatusLabel: string | null;
  sourceCount: number;
  thumbnailUrl: string | null;
  modifiedAt: string | null;
  hasFlashcards: boolean;
  flashcardCount: number;
};

export type DictionaryRelatedEntry = {
  slug: string;
  title: string;
  href: string;
  typeLabel: string | null;
  reason: string;
};

export type DictionaryEntryModel = {
  slug: string;
  title: string;
  typeLabel: string | null;
  languageLabel: string | null;
  categoryLabel: string | null;
  meaning: string | null;
  whyUseful: string | null;
  examples: string[];
  relatedPhrases: string[];
  relatedConcepts: string[];
  foundIn: string[];
  sourceNoteLinks: Array<{ label: string; href: string }>;
  occurrences: number | null;
  reviewStatusLabel: string | null;
  tags: string[];
  aliases: string[];
  flashcards: LifeLabFlashcard[];
  thumbnailUrl: string | null;
  relatedEntries: DictionaryRelatedEntry[];
  content: string;
  relativePath: string;
};

export type DictionaryBrowseFilters = {
  query: string;
  category: DictionaryCategoryChipId;
  language: DictionaryLanguageChipId;
  status: DictionaryStatusChipId;
  sort: DictionarySortKey;
};

export const DEFAULT_DICTIONARY_BROWSE_FILTERS: DictionaryBrowseFilters = {
  query: "",
  category: "all",
  language: "all",
  status: "all",
  sort: "newest",
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function dictionaryEntryHref(slug: string): string {
  return `/learning-dictionary/${slug}`;
}

export function lifeLabDictionaryNoteHref(slug: string): string {
  return `/life-lab/learning-dictionary/${slug}`;
}

function resolveOccurrences(metadata?: LifeLabNoteMetadata | null): number | null {
  const value = metadata?.occurrences;

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function resolveSourceNotes(metadata?: LifeLabNoteMetadata | null): string[] {
  return asStringArray(metadata?.source_notes);
}

function resolveAliases(metadata?: LifeLabNoteMetadata | null): string[] {
  return asStringArray(metadata?.aliases);
}

function typeLabel(typeId: DictionaryEntryTypeId | null): string | null {
  if (!typeId) {
    return null;
  }

  return typeId.charAt(0).toUpperCase() + typeId.slice(1);
}

function languageLabel(
  languageId: DictionaryLanguageId | null,
  metadata?: LifeLabNoteMetadata | null,
): string | null {
  if (languageId) {
    return languageId.charAt(0).toUpperCase() + languageId.slice(1);
  }

  const raw = metadata?.language?.trim();

  return raw || null;
}

export function toDictionaryCardModel(
  note: LifeLabNoteSummary,
): DictionaryCardModel | null {
  if (isDictionaryReferenceNote(note) || !isDictionaryEntryNote(note)) {
    return null;
  }

  const typeId = resolveDictionaryEntryType(note);
  const languageId = resolveDictionaryLanguage(note);
  const categoryId = resolveDictionaryCategory(note);
  const sourceNotes = resolveSourceNotes(note.metadata);
  const image = resolveLifeLabNoteImage(note.metadata);
  const reviewStatus = resolveStudyStatusValue(note.metadata);
  const occurrences = resolveOccurrences(note.metadata);
  const meaning =
    note.metadata?.meaning?.trim() ||
    note.excerpt?.trim() ||
    "";

  return {
    slug: note.slug,
    title: note.title,
    href: dictionaryEntryHref(note.slug),
    typeId,
    typeLabel: typeLabel(typeId),
    languageId,
    languageLabel: languageLabel(languageId, note.metadata),
    categoryId,
    categoryLabel: categoryId ? dictionaryCategoryLabel(categoryId) : null,
    tags: (note.metadata?.tags ?? []).slice(0, 3),
    definition: meaning,
    occurrences,
    reviewStatus,
    reviewStatusLabel: resolveStudyStatusLabel(note.metadata),
    sourceCount: sourceNotes.length,
    thumbnailUrl: image?.url ?? note.metadata?.thumbnailUrl ?? null,
    modifiedAt: note.modifiedAt,
    hasFlashcards: Boolean(note.hasFlashcards),
    flashcardCount: note.flashcardCount ?? 0,
  };
}

function extractLabeledSection(body: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `^\\*\\*${escaped}\\*\\*\\s*\\n+([\\s\\S]*?)(?=\\n##\\s+|\\n\\*\\*[A-Z][^*]+\\*\\*|\\n---\\s*$|$)`,
        "im",
      ),
      new RegExp(
        `^##\\s+${escaped}\\s*\\n+([\\s\\S]*?)(?=\\n##\\s+|$)`,
        "im",
      ),
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);

      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
  }

  return null;
}

function extractListItems(section: string | null): string[] {
  if (!section) {
    return [];
  }

  return section
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, ""))
    .map((line) => line.replace(/^["“]|["”]$/g, "").trim())
    .filter((line) => line && !line.startsWith("#"));
}

function parseSourceNoteLink(raw: string): { label: string; href: string } {
  const markdownLink = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

  if (markdownLink) {
    return { label: markdownLink[1], href: markdownLink[2] };
  }

  if (raw.startsWith("/life-lab/") || raw.startsWith("/learning-dictionary/")) {
    const label = raw.split("/").filter(Boolean).at(-1) ?? raw;

    return { label, href: raw };
  }

  if (raw.includes("/")) {
    return {
      label: raw.split("/").filter(Boolean).at(-1) ?? raw,
      href: lifeLabDictionaryNoteHref(
        raw.replace(/\.md$/i, "").replace(/\//g, "__"),
      ),
    };
  }

  return { label: raw, href: lifeLabDictionaryNoteHref(raw) };
}

export function buildDictionaryEntryModel(
  note: LifeLabNote,
  allNotes: LifeLabNoteSummary[],
): DictionaryEntryModel {
  const body = note.content;
  const typeId = resolveDictionaryEntryType(note);
  const languageId = resolveDictionaryLanguage(note);
  const categoryId = resolveDictionaryCategory(note);
  const meaning =
    note.metadata?.meaning?.trim() ||
    extractLabeledSection(body, ["Meaning", "Definition"]) ||
    extractDictionaryDefinition(body) ||
    null;
  const whyUseful = extractLabeledSection(body, [
    "Why it is useful",
    "Why useful",
    "Usefulness",
  ]);
  const examples = extractListItems(
    extractLabeledSection(body, [
      "Example sentences",
      "Examples",
      "Example",
    ]),
  );
  const relatedPhrases = extractListItems(
    extractLabeledSection(body, ["Related phrases", "Related phrase"]),
  );
  const relatedConcepts = extractListItems(
    extractLabeledSection(body, ["Related concepts", "Related concept"]),
  );
  const foundInRaw = extractListItems(
    extractLabeledSection(body, ["Found in", "Sources", "Source notes"]),
  );
  const sourceNotes = resolveSourceNotes(note.metadata);
  const foundIn = [...new Set([...foundInRaw, ...sourceNotes])];
  const image = resolveLifeLabNoteImage(note.metadata);

  return {
    slug: note.slug,
    title: dictionaryDisplayTitle({
      title: note.title,
      metadata: note.metadata,
      body,
    }),
    typeLabel: typeLabel(typeId),
    languageLabel: languageLabel(languageId, note.metadata),
    categoryLabel: categoryId ? dictionaryCategoryLabel(categoryId) : null,
    meaning,
    whyUseful,
    examples,
    relatedPhrases,
    relatedConcepts,
    foundIn,
    sourceNoteLinks: foundIn.map(parseSourceNoteLink),
    occurrences: resolveOccurrences(note.metadata),
    reviewStatusLabel: resolveStudyStatusLabel(note.metadata),
    tags: note.metadata?.tags ?? [],
    aliases: resolveAliases(note.metadata),
    flashcards: note.flashcards ?? [],
    thumbnailUrl: image?.url ?? note.metadata?.thumbnailUrl ?? null,
    relatedEntries: findRelatedDictionaryEntries(note, allNotes),
    content: body,
    relativePath: note.relativePath,
  };
}

function sharedOverlap(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((value) => value.trim().toLowerCase()));

  return left.filter((value) => rightSet.has(value.trim().toLowerCase()));
}

export function findRelatedDictionaryEntries(
  note: Pick<LifeLabNoteSummary, "slug" | "metadata" | "title">,
  allNotes: LifeLabNoteSummary[],
  limit = 8,
): DictionaryRelatedEntry[] {
  const tags = note.metadata?.tags ?? [];
  const people = note.metadata?.people ?? [];
  const related = note.metadata?.related ?? [];
  const sourceNotes = resolveSourceNotes(note.metadata);
  const scored: Array<DictionaryRelatedEntry & { score: number }> = [];

  for (const candidate of allNotes) {
    if (candidate.slug === note.slug) {
      continue;
    }

    if (
      isDictionaryReferenceNote(candidate) ||
      !isDictionaryEntryNote(candidate)
    ) {
      continue;
    }

    const reasons: string[] = [];
    let score = 0;

    const tagHits = sharedOverlap(tags, candidate.metadata?.tags ?? []);

    if (tagHits.length > 0) {
      score += tagHits.length * 3;
      reasons.push("shared tags");
    }

    const peopleHits = sharedOverlap(people, candidate.metadata?.people ?? []);

    if (peopleHits.length > 0) {
      score += peopleHits.length * 3;
      reasons.push("shared people");
    }

    const relatedHits = sharedOverlap(related, [
      ...(candidate.metadata?.related ?? []),
      candidate.title,
      candidate.metadata?.term ?? "",
    ]);

    if (relatedHits.length > 0) {
      score += relatedHits.length * 4;
      reasons.push("related concepts");
    }

    const candidateSources = resolveSourceNotes(candidate.metadata);
    const sourceHits = sharedOverlap(sourceNotes, candidateSources);

    if (sourceHits.length > 0) {
      score += sourceHits.length * 5;
      reasons.push("same source note");
    }

    if (score <= 0) {
      continue;
    }

    const typeId = resolveDictionaryEntryType(candidate);

    scored.push({
      slug: candidate.slug,
      title: candidate.title,
      href: dictionaryEntryHref(candidate.slug),
      typeLabel: typeLabel(typeId),
      reason: reasons[0] ?? "related",
      score,
    });
  }

  return scored
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit)
    .map(({ score: _score, ...entry }) => entry);
}

function editDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  for (let row = 0; row < rows; row += 1) {
    matrix[row]![0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0]![col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row]![col] = Math.min(
        matrix[row - 1]![col]! + 1,
        matrix[row]![col - 1]! + 1,
        matrix[row - 1]![col - 1]! + cost,
      );
    }
  }

  return matrix[left.length]![right.length]!;
}

function fuzzyHaystackScore(haystack: string, query: string): number {
  const normalizedHaystack = normalizeSearchText(haystack);
  const normalizedQuery = normalizeSearchText(query.trim());

  if (!normalizedQuery) {
    return 1;
  }

  if (normalizedHaystack.includes(normalizedQuery)) {
    return 100;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return 0;
  }

  let matched = 0;

  for (const token of tokens) {
    if (normalizedHaystack.includes(token)) {
      matched += 1;
      continue;
    }

    if (token.length > 3) {
      const words = normalizedHaystack.split(/\s+/);
      const maxDistance = token.length > 6 ? 2 : 1;
      const soft = words.some(
        (word) =>
          Math.abs(word.length - token.length) <= maxDistance &&
          editDistance(word, token) <= maxDistance,
      );

      if (soft) {
        matched += 0.75;
      }
    }
  }

  return matched / tokens.length >= 0.6 ? matched * 10 : 0;
}

export function dictionaryNoteSearchBlob(
  note: LifeLabNoteSummary,
): string {
  const metadata = note.metadata ?? {};

  return [
    note.title,
    metadata.term,
    metadata.display_title,
    metadata.meaning,
    metadata.summary,
    note.excerpt,
    note.searchText,
    ...(metadata.aliases ?? []),
    ...(metadata.tags ?? []),
    ...(metadata.related ?? []),
    ...(metadata.source_notes ?? []),
    metadata.category,
    metadata.language,
    metadata.type,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

export function dictionaryNoteMatchesQuery(
  note: LifeLabNoteSummary,
  query: string,
): boolean {
  return fuzzyHaystackScore(dictionaryNoteSearchBlob(note), query) > 0;
}

export function filterDictionaryNotes(
  notes: LifeLabNoteSummary[],
  filters: DictionaryBrowseFilters,
): LifeLabNoteSummary[] {
  return notes.filter((note) => {
    if (isDictionaryReferenceNote(note) || !isDictionaryEntryNote(note)) {
      return false;
    }

    if (filters.query && !dictionaryNoteMatchesQuery(note, filters.query)) {
      return false;
    }

    if (filters.category !== "all") {
      const languageId = resolveDictionaryLanguage(note);
      const categoryId = resolveDictionaryCategory(note);
      const typeId = resolveDictionaryEntryType(note);
      const chip = filters.category;

      const matchesLanguageChip =
        (chip === "english" || chip === "persian") && languageId === chip;
      const matchesCategoryChip =
        categoryId === chip ||
        typeId === chip.replace(/s$/, "") ||
        (chip === "art" && (categoryId === "art" || typeId === "artwork")) ||
        (chip === "films" && (categoryId === "films" || typeId === "film")) ||
        (chip === "books" && (categoryId === "books" || typeId === "book")) ||
        (chip === "events" && (categoryId === "events" || typeId === "event")) ||
        (chip === "organizations" &&
          (categoryId === "organizations" || typeId === "organization")) ||
        (chip === "people" && (categoryId === "people" || typeId === "person")) ||
        (chip === "places" && (categoryId === "places" || typeId === "place")) ||
        (chip === "concepts" &&
          (categoryId === "concepts" || typeId === "concept"));

      if (!matchesLanguageChip && !matchesCategoryChip) {
        return false;
      }
    }

    if (filters.language !== "all") {
      if (resolveDictionaryLanguage(note) !== filters.language) {
        return false;
      }
    }

    if (filters.status !== "all") {
      const status = resolveStudyStatusValue(note.metadata);

      if (status !== filters.status) {
        return false;
      }
    }

    return true;
  });
}

const STATUS_SORT_RANK: Record<string, number> = {
  new: 0,
  studying: 1,
  reviewed: 2,
  revisit: 3,
  learned: 4,
};

export function sortDictionaryNotes(
  notes: LifeLabNoteSummary[],
  sort: DictionarySortKey,
): LifeLabNoteSummary[] {
  const sorted = [...notes];

  sorted.sort((left, right) => {
    switch (sort) {
      case "alpha":
        return left.title.localeCompare(right.title);
      case "encounters": {
        const leftCount = resolveOccurrences(left.metadata) ?? 0;
        const rightCount = resolveOccurrences(right.metadata) ?? 0;

        if (leftCount !== rightCount) {
          return rightCount - leftCount;
        }

        return left.title.localeCompare(right.title);
      }
      case "updated": {
        const leftTime = left.modifiedAt ? Date.parse(left.modifiedAt) : 0;
        const rightTime = right.modifiedAt ? Date.parse(right.modifiedAt) : 0;

        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }

        return left.title.localeCompare(right.title);
      }
      case "status": {
        const leftRank =
          STATUS_SORT_RANK[resolveStudyStatusValue(left.metadata) ?? ""] ?? 99;
        const rightRank =
          STATUS_SORT_RANK[resolveStudyStatusValue(right.metadata) ?? ""] ?? 99;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.title.localeCompare(right.title);
      }
      case "newest":
      default: {
        const leftTime = left.modifiedAt ? Date.parse(left.modifiedAt) : 0;
        const rightTime = right.modifiedAt ? Date.parse(right.modifiedAt) : 0;

        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }

        return left.title.localeCompare(right.title);
      }
    }
  });

  return sorted;
}

export function collectDictionaryBrowseCards(
  notes: LifeLabNoteSummary[],
  filters: DictionaryBrowseFilters = DEFAULT_DICTIONARY_BROWSE_FILTERS,
): DictionaryCardModel[] {
  const filtered = filterDictionaryNotes(notes, filters);
  const sorted = sortDictionaryNotes(filtered, filters.sort);

  return sorted
    .map(toDictionaryCardModel)
    .filter((card): card is DictionaryCardModel => card != null);
}
