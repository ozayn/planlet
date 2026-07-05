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
  flashcardNoteCount: number;
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  refreshHref: string;
};

export function LifeLabSectionBrowser({
  sectionId,
  notes,
  filterOptions,
  flashcardNoteCount,
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
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const filteredNotes = useMemo(() => {
    const metadataFiltered = filterLifeLabNotes(notes, filters);

    if (!searchQuery) {
      return metadataFiltered;
    }

    return metadataFiltered.filter((note) => noteMatchesSearch(note, searchQuery));
  }, [filters, notes, searchQuery]);

  const groups = useMemo(
    () => groupLifeLabNotes(filteredNotes),
    [filteredNotes],
  );

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

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <form
          className="flex gap-2"
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
          <button type="submit" className="ui-btn-secondary shrink-0 px-3 text-sm">
            Search
          </button>
        </form>

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
                    {filterOptions[key].map((value) => (
                      <Link
                        key={`${key}-${value}`}
                        href={buildHref(pathname, searchParams, { [key]: value })}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          filters[key] === value
                            ? "bg-accent-cream text-foreground"
                            : "text-muted hover:bg-accent-cream/50"
                        }`}
                      >
                        {value}
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

        {flashcardNoteCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/life-lab/${sectionId}/study${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
            >
              Study flashcards ({flashcardNoteCount})
            </Link>
          </div>
        ) : null}
      </div>

      {filteredNotes.length === 0 ? (
        <p className="text-sm text-muted">No notes match your search or filters.</p>
      ) : (
        <LifeLabSectionNotes
          sectionId={sectionId}
          groups={groups}
          listingDiagnostic={listingDiagnostic}
          showDiagnostics={showDiagnostics}
          refreshHref={refreshHref}
        />
      )}
    </div>
  );
}
