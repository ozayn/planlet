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
  buildLifeLabHighlights,
  isLifeLabSortKey,
  LIFE_LAB_DEFAULT_SORT,
  LIFE_LAB_SORT_KEYS,
  LIFE_LAB_SORT_LABELS,
  shouldShowLifeLabHighlights,
  type LifeLabSortKey,
} from "@/lib/life-lab/browse";
import { groupLifeLabNotes } from "@/lib/life-lab/organization";
import { noteMatchesSearch } from "@/lib/life-lab/search";
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

  const highlights = useMemo(
    () =>
      shouldShowLifeLabHighlights(notes.length, hasActiveQuery)
        ? buildLifeLabHighlights(notes)
        : null,
    [hasActiveQuery, notes],
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
    <div className="space-y-4">
      <div className="space-y-3">
        <form
          className="flex gap-2 md:max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search notes in this section"
            className="ui-input min-w-0 flex-1"
            aria-label="Search Life Lab notes"
          />
          <button
            type="submit"
            className="ui-btn-secondary shrink-0 px-3 text-sm md:hidden"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="shrink-0">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="rounded-full border border-border/70 bg-transparent px-2 py-1.5 text-xs text-foreground"
            >
              {LIFE_LAB_SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {LIFE_LAB_SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          {showSectionStudyLink ? (
            <Link
              href={`/life-lab/${sectionId}/study${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
            >
              Study all · {flashcardStats.totalCards} cards
            </Link>
          ) : null}
        </div>

        {availableFilters.length > 0 ? (
          <details className="ui-settings-details group">
            <summary className="ui-settings-details-summary">
              Filters
              {activeFilterEntries.length > 0
                ? ` · ${activeFilterEntries.length} active`
                : ""}
            </summary>
            <div className="ui-settings-details-body space-y-3">
              {availableFilters.map((key) => (
                <div key={key} className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
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
          </details>
        ) : null}
      </div>

      {highlights?.latest[0] ? (
        <p className="text-xs text-muted">
          Latest{" "}
          <Link
            href={`/life-lab/${sectionId}/${highlights.latest[0].slug}`}
            className="font-medium text-foreground transition-colors hover:text-foreground/80"
          >
            {highlights.latest[0].title}
          </Link>
          {highlights.latest[0].dateLabel ?? highlights.latest[0].modifiedAtLabel
            ? ` · ${highlights.latest[0].dateLabel ?? highlights.latest[0].modifiedAtLabel}`
            : ""}
        </p>
      ) : null}

      {filteredNotes.length === 0 ? (
        <p className="text-sm text-muted">No notes match your search or filters.</p>
      ) : (
        <LifeLabSectionNotes
          sectionId={sectionId}
          groups={groups}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
          refreshHref={refreshHref}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}
