"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  LifeLabBrowseNote,
} from "@/lib/life-lab";
import type { LifeLabFilterKey } from "@/lib/life-lab/filters";
import { filterLifeLabNotes } from "@/lib/life-lab/filters";
import { noteMatchesSearch } from "@/lib/life-lab/search";
import { LifeLabMetadataChips } from "@/components/life-lab/life-lab-metadata-chips";
import { LifeLabNoteCardMeta } from "@/components/life-lab/life-lab-note-card-meta";

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

function readFilters(searchParams: URLSearchParams) {
  const filters: Partial<Record<LifeLabFilterKey, string>> = {};

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

type LifeLabHomeBrowserProps = {
  notes: LifeLabBrowseNote[];
  flashcardNoteCount: number;
};

export function LifeLabHomeBrowser({
  notes,
  flashcardNoteCount,
}: LifeLabHomeBrowserProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("q")?.trim() ?? "",
  );

  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const filteredNotes = useMemo(() => {
    const metadataFiltered = filterLifeLabNotes(notes, filters) as LifeLabBrowseNote[];

    if (!searchQuery) {
      return metadataFiltered;
    }

    return metadataFiltered.filter((note) => noteMatchesSearch(note, searchQuery));
  }, [filters, notes, searchQuery]);

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
            placeholder="Search across Life Lab notes"
            className="ui-input min-w-0 flex-1"
            aria-label="Search Life Lab notes"
          />
          <button type="submit" className="ui-btn-secondary shrink-0 px-3 text-sm">
            Search
          </button>
        </form>

        {flashcardNoteCount > 0 ? (
          <Link
            href={`/life-lab/study${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
            className="inline-flex rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
          >
            Study all flashcards ({flashcardNoteCount})
          </Link>
        ) : null}
      </div>

      {searchQuery || Object.keys(filters).length > 0 ? (
        filteredNotes.length === 0 ? (
          <p className="text-sm text-muted">No notes match your search.</p>
        ) : (
          <ul className="space-y-2">
            {filteredNotes.map((note) => (
              <li key={`${note.sectionId}-${note.slug}`}>
                <div className="ui-card-padded transition-colors hover:bg-accent-cream/25">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
                    {note.sectionLabel}
                    {note.subfolderLabel ? ` · ${note.subfolderLabel}` : ""}
                  </p>
                  <Link
                    href={`/life-lab/${note.sectionId}/${note.slug}`}
                    className="block text-base font-semibold text-foreground transition-colors hover:text-foreground/80"
                  >
                    {note.title}
                  </Link>
                  <LifeLabMetadataChips
                    metadata={note.metadata}
                    sectionId={note.sectionId}
                    sectionLabel={note.sectionLabel}
                    subfolderLabel={note.subfolderLabel}
                    variant="card"
                    className="mt-2"
                  />
                  <LifeLabNoteCardMeta
                    sectionId={note.sectionId}
                    note={note}
                    className="mt-2"
                  />
                  {note.excerpt ? (
                    <Link
                      href={`/life-lab/${note.sectionId}/${note.slug}`}
                      className="mt-2 block text-sm leading-relaxed text-muted"
                    >
                      {note.excerpt}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-sm text-muted">
          Search by title, tags, topics, people, playlist, or note text across all
          Life Lab sections.
        </p>
      )}
    </div>
  );
}
