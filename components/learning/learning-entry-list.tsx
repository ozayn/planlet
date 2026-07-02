"use client";

import { useMemo, useState } from "react";

import { LearningEntryCard } from "@/components/learning/learning-entry-card";
import type { SerializedLearningEntry } from "@/lib/learning-journey/constants";
import {
  filterLearningEntries,
  LEARNING_ENTRY_FILTERS,
  type LearningEntryFilter,
} from "@/lib/learning-journey/search";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LearningEntryListProps = {
  entries: SerializedLearningEntry[];
  timezone: string;
  disabled?: boolean;
  onEdit: (entry: SerializedLearningEntry) => void;
  onDelete: (entryId: string) => void;
};

export function LearningEntryList({
  entries,
  timezone,
  disabled = false,
  onEdit,
  onDelete,
}: LearningEntryListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LearningEntryFilter>("all");

  const filteredEntries = useMemo(
    () =>
      filterLearningEntries(entries, {
        query,
        filter,
        timezone,
      }),
    [entries, query, filter, timezone],
  );

  const hasActiveFilters = query.trim().length > 0 || filter !== "all";

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Recent learnings</h2>
        <p className="text-xs text-muted-light">
          {entries.length === 0
            ? "Nothing captured yet"
            : hasActiveFilters
              ? `${filteredEntries.length} of ${entries.length}`
              : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">Search learnings</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search learnings..."
              className="ui-input min-h-10 w-full text-sm"
              dir="auto"
              {...passwordManagerSafeControlProps}
            />
          </label>

          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Filter learnings"
          >
            {LEARNING_ENTRY_FILTERS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                role="tab"
                aria-selected={filter === entry.value}
                onClick={() => setFilter(entry.value)}
                className={`min-h-9 rounded-lg px-3 text-sm transition-colors ${
                  filter === entry.value ? "ui-segment-active" : "ui-segment"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-soft px-4 py-8 text-center">
          <p className="text-sm text-muted">Your learning timeline will appear here.</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-soft px-4 py-8 text-center">
          <p className="text-sm text-muted">No learnings match your search.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredEntries.map((entry) => (
            <li key={entry.id}>
              <LearningEntryCard
                entry={entry}
                disabled={disabled}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
