"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FlashcardSourceLink } from "@/components/life-lab/flashcard-source-link";
import { useRecentFlashcardDeckIds } from "@/components/life-lab/use-flashcard-session";
import {
  filterFlashcardDecks,
  flashcardDeckLanguageLabel,
  flashcardSourceKindLabel,
  type FlashcardDeckFilters,
  type FlashcardDeckLanguage,
  type FlashcardDeckSourceKind,
  type FlashcardDeckSummary,
} from "@/lib/life-lab/flashcard-decks";

type FlashcardsPageContentProps = {
  decks: FlashcardDeckSummary[];
};

const SOURCE_FILTERS: Array<FlashcardDeckSourceKind | "all"> = [
  "all",
  "youtube",
  "podcasts",
  "references",
  "topics",
  "lectures",
  "bbc",
];

const LANGUAGE_FILTERS: Array<FlashcardDeckLanguage | "all"> = [
  "all",
  "english",
  "persian",
  "mixed",
];

const SORT_OPTIONS: Array<NonNullable<FlashcardDeckFilters["sort"]>> = [
  "newest",
  "alphabetical",
  "most-cards",
  "recently-viewed",
];

function sourceFilterLabel(value: FlashcardDeckSourceKind | "all"): string {
  return value === "all" ? "All" : flashcardSourceKindLabel(value);
}

function languageFilterLabel(value: FlashcardDeckLanguage | "all"): string {
  return value === "all" ? "All languages" : flashcardDeckLanguageLabel(value);
}

function sortLabel(value: NonNullable<FlashcardDeckFilters["sort"]>): string {
  switch (value) {
    case "alphabetical":
      return "Alphabetical";
    case "most-cards":
      return "Most cards";
    case "recently-viewed":
      return "Recently viewed";
    default:
      return "Newest";
  }
}

function DeckCard({ deck }: { deck: FlashcardDeckSummary }) {
  const parseFailed = deck.cardCount === 0 && deck.parseIssues.length > 0;

  return (
    <Link
      href={`/life-lab/flashcards/${deck.slug}`}
      className="ui-card-padded block space-y-2 transition-colors hover:bg-accent-cream/25"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground" dir="auto">
          {deck.title}
        </h3>
        <span className="shrink-0 text-xs text-muted-light">
          {parseFailed
            ? "Unavailable"
            : `${deck.cardCount} card${deck.cardCount === 1 ? "" : "s"}`}
        </span>
      </div>
      <FlashcardSourceLink
        href={deck.sourceNoteHref}
        title={deck.sourceNoteTitle}
        sectionId={deck.sourceSectionId}
      />
      <p className="text-xs text-muted">
        {[
          flashcardSourceKindLabel(deck.sourceKind),
          deck.category,
          flashcardDeckLanguageLabel(deck.language),
          deck.modifiedAtLabel,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </Link>
  );
}

export function FlashcardsPageContent({ decks }: FlashcardsPageContentProps) {
  const [query, setQuery] = useState("");
  const [sourceKind, setSourceKind] = useState<
    FlashcardDeckSourceKind | "all"
  >("all");
  const [language, setLanguage] = useState<FlashcardDeckLanguage | "all">(
    "all",
  );
  const [sort, setSort] =
    useState<NonNullable<FlashcardDeckFilters["sort"]>>("newest");
  const recentIds = useRecentFlashcardDeckIds();

  const filtered = useMemo(
    () =>
      filterFlashcardDecks(
        decks,
        { q: query, sourceKind, language, sort },
        recentIds,
      ),
    [decks, query, sourceKind, language, sort, recentIds],
  );

  if (decks.length === 0) {
    return (
      <p className="text-sm text-muted">
        No Life Lab flashcard decks have been created yet.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-flashcards-layout="decks-v1">
      <label className="block">
        <span className="sr-only">Search decks</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search decks, questions, answers…"
          className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {SOURCE_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              sourceKind === value
                ? "bg-accent-cream text-foreground"
                : "border border-border/70 text-muted"
            }`}
            onClick={() => setSourceKind(value)}
          >
            {sourceFilterLabel(value)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {LANGUAGE_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              language === value
                ? "bg-accent-cream text-foreground"
                : "border border-border/70 text-muted"
            }`}
            onClick={() => setLanguage(value)}
          >
            {languageFilterLabel(value)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <span>Sort</span>
        <select
          value={sort}
          onChange={(event) =>
            setSort(event.target.value as NonNullable<FlashcardDeckFilters["sort"]>)
          }
          className="rounded-lg border border-border/70 bg-background px-2 py-1 text-sm text-foreground"
        >
          {SORT_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {sortLabel(value)}
            </option>
          ))}
        </select>
      </label>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">No decks match these filters.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}
