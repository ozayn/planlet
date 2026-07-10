"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  LifeLabListingDiagnostic,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import type { LifeLabFilterKey, LifeLabFilterOptions, LifeLabNoteFilters } from "@/lib/life-lab/filters";
import { filterLifeLabNotes } from "@/lib/life-lab/filters";
import {
  isLifeLabSortKey,
  LIFE_LAB_DEFAULT_SORT,
  LIFE_LAB_SORT_KEYS,
  LIFE_LAB_SORT_SHORT_LABELS,
  type LifeLabSortKey,
} from "@/lib/life-lab/browse";
import { groupLifeLabNotes } from "@/lib/life-lab/organization";
import { noteMatchesSearch } from "@/lib/life-lab/search";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";
import { LifeLabSectionNotes } from "@/components/life-lab/life-lab-section-notes";

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

const FILTER_LABELS: Record<LifeLabFilterKey, string> = {
  subfolder: "Folder",
  tag: "Tag",
  topic: "Topic",
  source: "Source",
  channel: "Channel",
  playlist: "Playlist",
  person: "Person",
  place: "Place",
  status: "Study status",
  month: "Month",
};

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

type LifeLabSectionBrowserProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
  filterOptions: LifeLabFilterOptions;
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  refreshHref: string;
};

export function LifeLabSectionBrowser({
  sectionId,
  notes,
  filterOptions,
  listingDiagnostic,
  showDiagnostics,
  refreshHref,
}: LifeLabSectionBrowserProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
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

  const hasActiveQuery = Boolean(searchQuery) || Object.keys(filters).length > 0;

  const sectionView = useMemo(
    () =>
      buildLifeLabSectionView({
        sectionId,
        notes: filteredNotes,
        groups,
        hasActiveQuery,
      }),
    [filteredNotes, groups, hasActiveQuery, sectionId],
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

  const activeFilterEntries = FILTER_PARAM_KEYS.flatMap((key) => {
    const value = filters[key];

    return value ? [{ key, value }] : [];
  });

  const availableFilters = FILTER_PARAM_KEYS.filter(
    (key) => filterOptions[key].length > 0,
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
            {availableFilters.length > 0 ? (
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                className="rounded-full border border-border/70 px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-border hover:text-foreground"
              >
                Filters
                {activeFilterEntries.length > 0
                  ? ` · ${activeFilterEntries.length}`
                  : ""}
              </button>
            ) : null}
          </div>
        </form>

        {showSectionStudyLink ? (
          <div>
            <Link
              href={`/life-lab/${sectionId}/study${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="inline-flex rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
            >
              Study all · {flashcardStats.totalCards} cards
            </Link>
          </div>
        ) : null}

        {filtersOpen && availableFilters.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-surface/70 p-3 space-y-3">
            {availableFilters.map((key) => (
              <div key={key} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-light">
                  {FILTER_LABELS[key]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href={buildHref(pathname, searchParams, { [key]: null })}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      !filters[key]
                        ? "bg-accent-cream text-foreground"
                        : "text-muted hover:bg-accent-cream/50"
                    }`}
                  >
                    All
                  </Link>
                  {filterOptions[key].map((option) => (
                    <Link
                      key={`${key}-${option.value}`}
                      href={buildHref(pathname, searchParams, {
                        [key]: option.value,
                      })}
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        filters[key] === option.value
                          ? "bg-accent-cream text-foreground"
                          : "text-muted hover:bg-accent-cream/50"
                      }`}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {activeFilterEntries.length > 0 ? (
              <Link
                href={pathname}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground"
              >
                Clear filters
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {filteredNotes.length === 0 ? (
        <p className="text-sm text-muted">No notes match your search or filters.</p>
      ) : (
        <LifeLabSectionNotes
          sectionId={sectionId}
          sectionView={sectionView}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
          refreshHref={refreshHref}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}
