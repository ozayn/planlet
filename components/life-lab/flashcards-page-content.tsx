"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
import { resolveFlashcardLibraryCardModel } from "@/lib/life-lab/flashcard-explore-ui";

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

function DeckCard({
  deck,
  sourceKind,
  language,
}: {
  deck: FlashcardDeckSummary;
  sourceKind: FlashcardDeckSourceKind | "all";
  language: FlashcardDeckLanguage | "all";
}) {
  const card = resolveFlashcardLibraryCardModel(deck, { sourceKind, language });
  const mobileDetail = [card.cardCountLabel, ...card.metaSegments]
    .filter(Boolean)
    .join(" · ");
  const desktopDetail = card.metaSegments.join(" · ");

  return (
    <Link
      href={card.href}
      aria-label={card.ariaLabel}
      title={card.canonicalTitle}
      data-flashcard-deck-card=""
      className="ui-card-padded block rounded-xl transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground line-clamp-2"
          dir="auto"
        >
          {card.displayTitle}
        </h3>
        <span className="hidden shrink-0 pt-0.5 text-xs tabular-nums text-muted-light sm:inline">
          {card.cardCountLabel}
        </span>
      </div>
      {card.dateLabel ? (
        <p className="mt-1 text-xs leading-snug text-muted">{card.dateLabel}</p>
      ) : null}
      {mobileDetail || desktopDetail ? (
        <p
          className={`text-xs leading-snug text-muted ${card.dateLabel ? "mt-0.5" : "mt-1"}`}
        >
          <span className="sm:hidden">{mobileDetail}</span>
          {desktopDetail ? (
            <span className="hidden sm:inline">{desktopDetail}</span>
          ) : null}
        </p>
      ) : null}
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
    <div className="space-y-3" data-flashcards-layout="decks-v2">
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
        <div className="grid gap-2 sm:gap-3" data-flashcards-deck-list="">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              sourceKind={sourceKind}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}
