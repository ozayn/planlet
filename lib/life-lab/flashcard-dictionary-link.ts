import type {
  LifeLabFlashcard,
  LifeLabNoteSummary,
} from "@/lib/life-lab/constants";
import {
  dictionaryDisplayTitle,
  isDictionaryReferenceNote,
} from "@/lib/life-lab/learning-dictionary";
import { dictionaryEntryHref } from "@/lib/learning-dictionary/model";
import type { FlashcardDeckSummary } from "@/lib/life-lab/flashcard-decks";
import { isReadmeRelativePath, isReadmeSlug } from "@/lib/life-lab/slug";
import { normalizeSearchText } from "@/lib/text-direction";

export type DictionaryMatchCandidate = {
  slug: string;
  title: string;
  href: string;
};

export type DictionaryMatchResult =
  | { status: "matched"; entry: DictionaryMatchCandidate }
  | { status: "ambiguous"; entries: DictionaryMatchCandidate[] }
  | { status: "none" };

export type FlashcardDictionaryLink = {
  term: string | null;
  href: string | null;
  ambiguity: DictionaryMatchCandidate[];
};

export type DictionaryFlashcardDeckLink = {
  id: string;
  title: string;
  href: string;
  cardCount: number;
  matchedTerm: string | null;
};

/** Case-, punctuation-, and Persian-orthography-insensitive match key. */
export function normalizeDictionaryMatchKey(text: string): string {
  return normalizeSearchText(text)
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripOuterQuotes(value: string): string {
  return value
    .trim()
    .replace(/^[“"‘'`]+/, "")
    .replace(/[”"'`]+$/, "")
    .trim();
}

/**
 * Prefer explicit card.term, then question patterns for vocabulary cards.
 * Non-vocabulary cards only resolve when an explicit term is present.
 */
export function inferVocabularyTermFromCard(
  card: Pick<LifeLabFlashcard, "question" | "cardType" | "term">,
): string | null {
  const explicit = card.term?.trim();
  if (explicit) {
    return explicit;
  }

  const question = card.question.trim();
  if (!question) {
    return null;
  }

  const doesMean = question.match(
    /^What does\s+[“"‘'](.+?)[”"'']\s+mean\s*\??$/i,
  );
  if (doesMean?.[1]) {
    return stripOuterQuotes(doesMean[1]);
  }

  const completePhrase = question.match(
    /^Complete the phrase:\s*(.+?)\s*$/i,
  );
  if (completePhrase?.[1]) {
    return stripOuterQuotes(completePhrase[1]);
  }

  const whatIs = question.match(/^What is\s+(.+?)\s*\??$/i);
  if (whatIs?.[1] && card.cardType === "vocabulary") {
    return stripOuterQuotes(whatIs[1].replace(/\?+$/, "")) || null;
  }

  if (card.cardType === "vocabulary") {
    const withoutQuestionMark = question.replace(/\?+$/, "").trim();
    if (
      withoutQuestionMark &&
      withoutQuestionMark.length <= 80 &&
      !/\b(what|which|who|how|when|where|why|define|explain)\b/i.test(
        withoutQuestionMark,
      )
    ) {
      return stripOuterQuotes(withoutQuestionMark);
    }
  }

  return null;
}

function slugToMatchKey(slug: string): string {
  const leaf = slug.includes("__") ? (slug.split("__").at(-1) ?? slug) : slug;
  return normalizeDictionaryMatchKey(leaf.replace(/[-_]+/g, " "));
}

export function collectDictionaryEntryMatchKeys(input: {
  slug: string;
  title: string;
  metadata?: LifeLabNoteSummary["metadata"];
  relativePath?: string | null;
  subfolderLabel?: string | null;
}): string[] {
  const keys = new Set<string>();
  const add = (value?: string | null) => {
    if (!value?.trim()) {
      return;
    }
    const normalized = normalizeDictionaryMatchKey(value);
    if (normalized) {
      keys.add(normalized);
    }
  };

  add(input.metadata?.term);
  add(input.metadata?.display_title);
  add(input.title);
  add(
    dictionaryDisplayTitle({
      title: input.title,
      metadata: input.metadata,
      body: "",
    }),
  );
  add(slugToMatchKey(input.slug));

  for (const alias of input.metadata?.aliases ?? []) {
    add(alias);
  }

  return [...keys];
}

export function buildDictionaryMatchIndex(
  notes: LifeLabNoteSummary[],
): Map<string, DictionaryMatchCandidate[]> {
  const index = new Map<string, DictionaryMatchCandidate[]>();

  for (const note of notes) {
    if (isReadmeSlug(note.slug) || isReadmeRelativePath(note.relativePath)) {
      continue;
    }

    if (isDictionaryReferenceNote(note)) {
      continue;
    }

    const candidate: DictionaryMatchCandidate = {
      slug: note.slug,
      title: dictionaryDisplayTitle({
        title: note.title,
        metadata: note.metadata,
        body: "",
      }),
      href: dictionaryEntryHref(note.slug),
    };

    for (const key of collectDictionaryEntryMatchKeys(note)) {
      const existing = index.get(key) ?? [];
      if (!existing.some((entry) => entry.slug === candidate.slug)) {
        existing.push(candidate);
      }
      index.set(key, existing);
    }
  }

  return index;
}

export function matchDictionaryTerm(
  term: string,
  index: Map<string, DictionaryMatchCandidate[]>,
): DictionaryMatchResult {
  const key = normalizeDictionaryMatchKey(term);
  if (!key) {
    return { status: "none" };
  }

  const matches = index.get(key) ?? [];
  if (matches.length === 0) {
    return { status: "none" };
  }

  if (matches.length === 1) {
    return { status: "matched", entry: matches[0]! };
  }

  return { status: "ambiguous", entries: matches };
}

export function resolveFlashcardDictionaryLink(
  card: LifeLabFlashcard,
  index: Map<string, DictionaryMatchCandidate[]>,
): FlashcardDictionaryLink {
  const term = inferVocabularyTermFromCard(card);
  if (!term) {
    return { term: null, href: null, ambiguity: [] };
  }

  const result = matchDictionaryTerm(term, index);
  if (result.status === "matched") {
    return { term, href: result.entry.href, ambiguity: [] };
  }

  if (result.status === "ambiguous") {
    return { term, href: null, ambiguity: result.entries };
  }

  return { term, href: null, ambiguity: [] };
}

export type FlashcardWithDictionaryLink = LifeLabFlashcard & {
  dictionaryHref?: string | null;
  dictionaryAmbiguity?: DictionaryMatchCandidate[];
  dictionaryTerm?: string | null;
};

export function enrichFlashcardsWithDictionaryLinks(
  cards: LifeLabFlashcard[],
  index: Map<string, DictionaryMatchCandidate[]>,
): FlashcardWithDictionaryLink[] {
  return cards.map((card) => {
    const link = resolveFlashcardDictionaryLink(card, index);
    return {
      ...card,
      dictionaryHref: link.href,
      dictionaryAmbiguity: link.ambiguity.length > 0 ? link.ambiguity : undefined,
      dictionaryTerm: link.term,
    };
  });
}

export function findFlashcardDecksForDictionaryEntry(input: {
  decks: FlashcardDeckSummary[];
  entry: {
    slug: string;
    title: string;
    metadata?: LifeLabNoteSummary["metadata"];
  };
}): DictionaryFlashcardDeckLink[] {
  const entryKeys = new Set(
    collectDictionaryEntryMatchKeys({
      slug: input.entry.slug,
      title: input.entry.title,
      metadata: input.entry.metadata,
    }),
  );

  if (entryKeys.size === 0) {
    return [];
  }

  const links: DictionaryFlashcardDeckLink[] = [];

  for (const deck of input.decks) {
    if (deck.cardCount === 0) {
      continue;
    }

    let matchedTerm: string | null = null;

    for (const card of deck.cards) {
      const term = inferVocabularyTermFromCard(card);
      if (!term) {
        continue;
      }

      const key = normalizeDictionaryMatchKey(term);
      if (entryKeys.has(key)) {
        matchedTerm = term;
        break;
      }
    }

    if (!matchedTerm) {
      continue;
    }

    const href =
      deck.origin === "embedded" && deck.sourceNoteHref
        ? `${deck.sourceNoteHref}?view=flashcards`
        : `/life-lab/flashcards/${deck.slug}`;

    links.push({
      id: deck.id,
      title: deck.title,
      href,
      cardCount: deck.cardCount,
      matchedTerm,
    });
  }

  return links.sort((left, right) => left.title.localeCompare(right.title));
}
