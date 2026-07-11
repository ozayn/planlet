"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { LifeLabFilterPanel } from "@/components/life-lab/life-lab-filter-panel";
import { LifeLabSectionNotes } from "@/components/life-lab/life-lab-section-notes";
import type {
  LifeLabListingDiagnostic,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  isLifeLabSortKey,
  LIFE_LAB_DEFAULT_SORT,
  LIFE_LAB_SORT_KEYS,
  LIFE_LAB_SORT_SHORT_LABELS,
  type LifeLabSortKey,
} from "@/lib/life-lab/browse";
import {
  countActiveLifeLabFilters,
  LIFE_LAB_FILTER_LABELS,
  sanitizeLifeLabFilterOptions,
} from "@/lib/life-lab/filter-ui";
import type { LifeLabFilterKey, LifeLabFilterOptions, LifeLabNoteFilters } from "@/lib/life-lab/filters";
import {
  filterLifeLabNotes,
  LIFE_LAB_MULTI_VALUE_FILTER_KEYS,
  lifeLabFilterOptionLabel,
  parseLifeLabFilterValues,
} from "@/lib/life-lab/filters";
import { groupLifeLabNotes } from "@/lib/life-lab/organization";
import { noteMatchesSearch } from "@/lib/life-lab/search";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";

const FILTER_PARAM_KEYS: LifeLabFilterKey[] = [
  "subfolder",
  "tag",
  "topic",
  "source",
  "channel",
  "playlist",
  "person",
  "place",
  "status",
  "month",
];

function readFilters(searchParams: URLSearchParams): LifeLabNoteFilters {
  const filters: LifeLabNoteFilters = {};

  for (const key of FILTER_PARAM_KEYS) {
    const value = searchParams.get(key)?.trim();

    if (value) {
      filters[key] = value;
    }
  }

  return filters;
}

function buildHref(
  pathname: string,
  current: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function buildFiltersHref(
  pathname: string,
  current: URLSearchParams,
  filters: LifeLabNoteFilters,
): string {
  const updates: Record<string, string | null> = {};

  for (const key of FILTER_PARAM_KEYS) {
    updates[key] = filters[key] ?? null;
  }

  return buildHref(pathname, current, updates);
}

type ActiveFilterChip = {
  key: LifeLabFilterKey;
  value: string;
};

function countNonChannelFilters(filters: LifeLabNoteFilters): number {
  return FILTER_PARAM_KEYS.filter((key) => {
    if (key === "channel") {
      return false;
    }

    return Boolean(filters[key]?.trim());
  }).length;
}

function shouldUseYoutubeBrowseLayout(
  sectionId: LifeLabSectionId,
  searchQuery: string,
  filters: LifeLabNoteFilters,
): boolean {
  if (sectionId !== "youtube-learning") {
    return false;
  }

  if (searchQuery) {
    return false;
  }

  return countNonChannelFilters(filters) === 0;
}

function buildActiveFilterChips(filters: LifeLabNoteFilters): ActiveFilterChip[] {
  return FILTER_PARAM_KEYS.flatMap((key) => {
    const rawValue = filters[key];

    if (!rawValue) {
      return [];
    }

    if (
      (LIFE_LAB_MULTI_VALUE_FILTER_KEYS as readonly string[]).includes(key)
    ) {
      return parseLifeLabFilterValues(rawValue).map((value) => ({ key, value }));
    }

    return [{ key, value: rawValue }];
  });
}

type LifeLabSectionBrowserProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
  filterOptions: LifeLabFilterOptions;
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
};

export function LifeLabSectionBrowser({
  sectionId,
  notes,
  filterOptions,
  listingDiagnostic,
  showDiagnostics,
}: LifeLabSectionBrowserProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q")?.trim() ?? "",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const rawSort = searchParams.get("sort")?.trim() ?? "";
  const sort: LifeLabSortKey = isLifeLabSortKey(rawSort)
    ? rawSort
    : LIFE_LAB_DEFAULT_SORT;
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const sanitizedFilterOptions = useMemo(
    () =>
      sanitizeLifeLabFilterOptions(filterOptions, {
        includeFolderFilter: showDiagnostics,
      }),
    [filterOptions, showDiagnostics],
  );

  const filteredNotes = useMemo(() => {
    const metadataFiltered = filterLifeLabNotes(notes, filters);

    if (!searchQuery) {
      return metadataFiltered;
    }

    return metadataFiltered.filter((note) => noteMatchesSearch(note, searchQuery));
  }, [filters, notes, searchQuery]);

  const groups = useMemo(
    () => groupLifeLabNotes(filteredNotes, { sectionId, sort }),
    [filteredNotes, sectionId, sort],
  );

  const hasActiveQuery =
    Boolean(searchQuery) ||
    (!shouldUseYoutubeBrowseLayout(sectionId, searchQuery, filters) &&
      countActiveLifeLabFilters(filters) > 0);

  const sectionView = useMemo(
    () =>
      buildLifeLabSectionView({
        sectionId,
        notes: filteredNotes,
        groups,
        hasActiveQuery,
        sort,
        channelFilter: filters.channel ?? null,
      }),
    [filteredNotes, groups, hasActiveQuery, sectionId, sort, filters.channel],
  );

  const flashcardStats = useMemo(() => {
    const notesWithFlashcards = filteredNotes.filter(
      (note) => note.hasFlashcards && (note.flashcardCount ?? 0) > 0,
    );

    return {
      noteCount: notesWithFlashcards.length,
      totalCards: notesWithFlashcards.reduce(
        (total, note) => total + (note.flashcardCount ?? 0),
        0,
      ),
    };
  }, [filteredNotes]);

  const showSectionStudyLink = flashcardStats.noteCount > 1;
  const activeFilterChips = buildActiveFilterChips(filters);

  const hasFilterOptions = FILTER_PARAM_KEYS.some(
    (key) => sanitizedFilterOptions[key].length > 0,
  );

  function submitSearch(): void {
    router.replace(
      buildHref(pathname, searchParams, {
        q: searchInput.trim() || null,
      }),
    );
  }

  function setSort(nextSort: string): void {
    router.replace(
      buildHref(pathname, searchParams, {
        sort: nextSort === LIFE_LAB_DEFAULT_SORT ? null : nextSort,
      }),
    );
  }

  function applyFilters(nextFilters: LifeLabNoteFilters): void {
    router.replace(buildFiltersHref(pathname, searchParams, nextFilters));
  }

  function clearFilters(): void {
    router.replace(buildFiltersHref(pathname, searchParams, {}));
  }

  function removeFilterChip(key: LifeLabFilterKey, value: string): void {
    const currentValue = filters[key];

    if (!currentValue) {
      return;
    }

    if (
      (LIFE_LAB_MULTI_VALUE_FILTER_KEYS as readonly string[]).includes(key)
    ) {
      const remaining = parseLifeLabFilterValues(currentValue).filter(
        (item) => item !== value,
      );

      applyFilters({
        ...filters,
        [key]: remaining.length > 0 ? remaining.join(",") : undefined,
      });
      return;
    }

    applyFilters({
      ...filters,
      [key]: undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search notes"
            className="ui-input min-w-0 flex-1"
            aria-label="Search Life Lab notes"
          />
          <div className="flex shrink-0 items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="sr-only">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-full border border-border/70 bg-transparent px-3 py-2 text-xs text-foreground"
                aria-label="Sort notes"
              >
                {LIFE_LAB_SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {LIFE_LAB_SORT_SHORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            {hasFilterOptions ? (
              <button
                ref={filtersButtonRef}
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="rounded-full border border-border/70 px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground"
              >
                Filters
                {activeFilterChips.length > 0
                  ? ` · ${activeFilterChips.length}`
                  : ""}
              </button>
            ) : null}
          </div>
        </form>

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilterChips.map((chip) => (
              <button
                key={`${chip.key}-${chip.value}`}
                type="button"
                onClick={() => removeFilterChip(chip.key, chip.value)}
                className="rounded-full bg-accent-cream px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent-cream/70"
              >
                {LIFE_LAB_FILTER_LABELS[chip.key]}:{" "}
                {lifeLabFilterOptionLabel(
                  sanitizedFilterOptions[chip.key],
                  chip.value,
                )}{" "}
                ×
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        ) : null}

        {showSectionStudyLink ? (
          <div>
            <Link
              href={`/life-lab/${sectionId}/study${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="inline-flex flex-col rounded-xl border border-border/70 bg-accent-cream/40 px-4 py-3 transition-colors hover:bg-accent-cream/70"
            >
              <span className="text-sm font-medium text-foreground">
                Study all flashcards
              </span>
              <span className="text-xs text-muted">
                {flashcardStats.totalCards} cards
              </span>
            </Link>
          </div>
        ) : null}
      </div>

      {hasFilterOptions ? (
        <LifeLabFilterPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          filterOptions={sanitizedFilterOptions}
          onApply={applyFilters}
          onClear={clearFilters}
          showFolderFilter={showDiagnostics}
        />
      ) : null}

      {filteredNotes.length === 0 ? (
        <p className="text-sm text-muted">No notes match your search or filters.</p>
      ) : (
        <LifeLabSectionNotes
          sectionId={sectionId}
          sectionView={sectionView}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
          searchQuery={searchQuery}
          contextNotes={filteredNotes}
        />
      )}
    </div>
  );
}
