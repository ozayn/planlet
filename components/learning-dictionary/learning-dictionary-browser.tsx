"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { LearningDictionaryCard } from "@/components/learning-dictionary/learning-dictionary-card";
import { LearningDictionaryEmpty } from "@/components/learning-dictionary/learning-dictionary-empty";
import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  collectDictionaryBrowseCards,
  DEFAULT_DICTIONARY_BROWSE_FILTERS,
  DICTIONARY_CATEGORY_CHIPS,
  DICTIONARY_LANGUAGE_CHIPS,
  DICTIONARY_SORT_KEYS,
  DICTIONARY_SORT_LABELS,
  DICTIONARY_STATUS_CHIPS,
  type DictionaryBrowseFilters,
  type DictionaryCategoryChipId,
  type DictionaryLanguageChipId,
  type DictionarySortKey,
  type DictionaryStatusChipId,
} from "@/lib/learning-dictionary/model";

type LearningDictionaryBrowserProps = {
  notes: LifeLabNoteSummary[];
};

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
        {label}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => {
          const active = option.id === value;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "bg-accent-cream/40 text-muted hover:bg-accent-cream/70 hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LearningDictionaryBrowser({
  notes,
}: LearningDictionaryBrowserProps) {
  const [filters, setFilters] = useState<DictionaryBrowseFilters>(
    DEFAULT_DICTIONARY_BROWSE_FILTERS,
  );

  const cards = useMemo(
    () => collectDictionaryBrowseCards(notes, filters),
    [notes, filters],
  );

  const hasAnyEntries = useMemo(
    () =>
      collectDictionaryBrowseCards(notes, DEFAULT_DICTIONARY_BROWSE_FILTERS)
        .length > 0,
    [notes],
  );

  function patchFilters(patch: Partial<DictionaryBrowseFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-1 space-y-3 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <label className="relative block">
          <span className="sr-only">Search dictionary</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => patchFilters({ query: event.target.value })}
            placeholder="Search terms, meanings, tags…"
            className="w-full rounded-xl border border-border/60 bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-light focus:border-foreground/30"
          />
        </label>

        <ChipRow
          label="Category"
          options={DICTIONARY_CATEGORY_CHIPS}
          value={filters.category}
          onChange={(category: DictionaryCategoryChipId) =>
            patchFilters({ category })
          }
        />
        <ChipRow
          label="Language"
          options={DICTIONARY_LANGUAGE_CHIPS}
          value={filters.language}
          onChange={(language: DictionaryLanguageChipId) =>
            patchFilters({ language })
          }
        />
        <ChipRow
          label="Status"
          options={DICTIONARY_STATUS_CHIPS}
          value={filters.status}
          onChange={(status: DictionaryStatusChipId) =>
            patchFilters({ status })
          }
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-light">
            {cards.length} {cards.length === 1 ? "entry" : "entries"}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted">
            <span className="sr-only">Sort</span>
            <select
              value={filters.sort}
              onChange={(event) =>
                patchFilters({
                  sort: event.target.value as DictionarySortKey,
                })
              }
              className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs outline-none"
            >
              {DICTIONARY_SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {DICTIONARY_SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!hasAnyEntries ? (
        <LearningDictionaryEmpty />
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No matching entries</p>
          <p className="mt-1 text-sm text-muted">
            Try a broader search or clear a filter.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <LearningDictionaryCard key={card.slug} card={card} />
          ))}
        </ul>
      )}
    </div>
  );
}
