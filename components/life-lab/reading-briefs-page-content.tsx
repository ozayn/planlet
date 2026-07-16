"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { LifeLabCollectionRow } from "@/components/life-lab/life-lab-collection-row";
import { ReadingBriefRow } from "@/components/life-lab/reading-brief-row";
import type {
  LifeLabListingDiagnostic,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  buildReadingBriefArchive,
  classifyReadingBriefNote,
  formatDailyBriefCollectionMeta,
  readingBriefContentDateLabel,
  readingBriefDailyListTitle,
  readingBriefDedupeKey,
  readingBriefReferenceDisplayTitle,
  readingBriefSavedArticleTitle,
  readingBriefSourceSlug,
  resolveReadingBriefSourceLabel,
  type ReadingBriefArchiveSort,
  type ReadingBriefArchiveTypeFilter,
  type ReadingBriefDateFilter,
} from "@/lib/life-lab/reading-briefs-archive";

type ReadingBriefsPageContentProps = {
  sectionId: LifeLabSectionId;
  notes: LifeLabNoteSummary[];
  listingDiagnostic: LifeLabListingDiagnostic | null;
  showDiagnostics: boolean;
  sort?: ReadingBriefArchiveSort;
  searchQuery?: string;
  /** Source slug from `?source=` (e.g. bbc-world-service). */
  sourceQuery?: string | null;
};

const TYPE_FILTERS: Array<{ id: ReadingBriefArchiveTypeFilter; label: string }> =
  [
    { id: "all", label: "All" },
    { id: "dailyBrief", label: "Daily briefs" },
    { id: "savedArticle", label: "Saved articles" },
  ];

const DATE_FILTERS: Array<{ id: ReadingBriefDateFilter; label: string }> = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-1">
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

function DebugPanel({ diagnostic }: { diagnostic: LifeLabListingDiagnostic }) {
  const rows = [
    { label: "Files found", value: String(diagnostic.fileCount) },
    { label: "Folders traversed", value: String(diagnostic.foldersTraversed) },
    { label: "Max depth used", value: String(diagnostic.maxDepthUsed) },
    {
      label: "Pagination occurred",
      value: diagnostic.paginationOccurred ? "Yes" : "No",
    },
  ];

  if (diagnostic.cache) {
    rows.push(
      {
        label: "Cache hit",
        value: diagnostic.cache.fromCache ? "Yes" : "No",
      },
      { label: "Cache key", value: diagnostic.cache.cacheKey },
      {
        label: "Drive API calls",
        value: String(diagnostic.cache.driveCalls ?? 0),
      },
    );
  }

  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
        <span className="font-medium text-muted">Debug</span>
      </summary>
      <div className="ui-settings-details-body space-y-2">
        <dl className="space-y-1.5 text-xs text-muted">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt>{row.label}</dt>
              <dd className="text-right text-foreground/80 [overflow-wrap:anywhere]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

function buildSourceHref(
  pathname: string,
  current: URLSearchParams,
  sourceKey: string | null,
): string {
  const params = new URLSearchParams(current.toString());

  if (sourceKey) {
    params.set("source", sourceKey);
  } else {
    params.delete("source");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Dedicated Reading Briefs archive for /life-lab/reading-briefs.
 */
export function ReadingBriefsPageContent({
  sectionId,
  notes,
  listingDiagnostic,
  showDiagnostics,
  sort = "newest",
  searchQuery = "",
  sourceQuery = null,
}: ReadingBriefsPageContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] =
    useState<ReadingBriefArchiveTypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<ReadingBriefDateFilter>("all");
  const [savedExpanded, setSavedExpanded] = useState(false);

  const activeSource = sourceQuery?.trim() || null;
  const hasSearch = Boolean(searchQuery.trim());

  const archive = useMemo(
    () =>
      buildReadingBriefArchive(notes, {
        typeFilter,
        dateFilter,
        sourceFilter: activeSource,
        sort,
      }),
    [notes, typeFilter, dateFilter, activeSource, sort],
  );

  const sourceOptions = [
    { id: "all", label: "All" },
    ...archive.sources.map((source) => ({
      id: readingBriefSourceSlug(source),
      label: source,
    })),
  ];

  const savedVisible = savedExpanded
    ? archive.savedArticles
    : archive.savedArticles.slice(0, 8);

  const showCollections =
    !hasSearch &&
    !activeSource &&
    archive.dailyCollections.length > 0 &&
    (typeFilter === "all" || typeFilter === "dailyBrief");
  const showCollectionDetail = Boolean(activeSource && archive.activeCollection);
  const showSearchHits = hasSearch && !activeSource;
  const showSaved =
    !hasSearch &&
    !activeSource &&
    archive.savedArticles.length > 0 &&
    (typeFilter === "all" || typeFilter === "savedArticle");
  const showReference =
    !hasSearch &&
    !activeSource &&
    archive.referenceNotes.length > 0 &&
    typeFilter === "all";

  const searchDaily = showSearchHits
    ? notes.filter((note) => classifyReadingBriefNote(note) === "dailyBrief")
    : [];
  const searchSaved = showSearchHits
    ? notes.filter((note) => classifyReadingBriefNote(note) === "savedArticle")
    : [];

  const marker =
    process.env.NODE_ENV === "development"
      ? { "data-reading-briefs-layout": "archive-v2" as const }
      : {};

  const filtersActive =
    typeFilter !== "all" || dateFilter !== "all" || Boolean(activeSource);

  return (
    <div className="space-y-6" {...marker}>
      {!activeSource ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
            <span className="font-medium text-muted">
              Filters{filtersActive ? " · on" : ""}
            </span>
          </summary>
          <div className="ui-settings-details-body space-y-2.5">
            <ChipRow
              label="Type"
              options={TYPE_FILTERS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
            {archive.sources.length > 1 ? (
              <ChipRow
                label="Source"
                options={sourceOptions}
                value={activeSource ?? "all"}
                onChange={(next) => {
                  router.replace(
                    buildSourceHref(
                      pathname,
                      searchParams,
                      next === "all" ? null : next,
                    ),
                  );
                }}
              />
            ) : null}
            <ChipRow
              label="Date"
              options={DATE_FILTERS}
              value={dateFilter}
              onChange={setDateFilter}
            />
          </div>
        </details>
      ) : null}

      {showCollectionDetail && archive.activeCollection ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <Link
              href={buildSourceHref(pathname, searchParams, null)}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Back to Reading Briefs
            </Link>
            <h2 className="text-base font-medium text-foreground">
              {archive.activeCollection.sourceLabel}
            </h2>
            <p className="text-sm text-muted">
              {archive.activeCollection.count === 1
                ? "1 daily brief"
                : `${archive.activeCollection.count} daily briefs`}
            </p>
          </div>
          <ul>
            {archive.activeCollection.notes.map((note) => {
              const labels = readingBriefDailyListTitle(note);

              return (
                <ReadingBriefRow
                  key={readingBriefDedupeKey(note)}
                  href={`/life-lab/${sectionId}/${note.slug}`}
                  title={labels.primary}
                  subtitle={note.excerpt?.trim() || null}
                  dateLabel={null}
                  layout="stacked-date"
                />
              );
            })}
          </ul>
        </section>
      ) : null}

      {showCollections ? (
        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted">
            Daily brief collections
          </h2>
          <ul className="space-y-0.5">
            {archive.dailyCollections.map((collection) => {
              const meta = formatDailyBriefCollectionMeta(collection);

              return (
                <LifeLabCollectionRow
                  key={collection.sourceKey}
                  href={buildSourceHref(
                    pathname,
                    searchParams,
                    collection.sourceKey,
                  )}
                  title={collection.sourceLabel}
                  image={null}
                  primaryMeta={meta.primaryMeta}
                  secondaryMeta={meta.secondaryMeta}
                  type="playlist"
                  showChevron
                />
              );
            })}
          </ul>
        </section>
      ) : null}

      {showSearchHits ? (
        <section className="space-y-3">
          {searchDaily.length > 0 ? (
            <div className="space-y-1.5">
              <h2 className="text-sm font-medium text-muted">Daily briefs</h2>
              <ul>
                {searchDaily.map((note) => (
                  <ReadingBriefRow
                    key={readingBriefDedupeKey(note)}
                    href={`/life-lab/${sectionId}/${note.slug}`}
                    title={resolveReadingBriefSourceLabel(note)}
                    dateLabel={readingBriefContentDateLabel(note, "weekday")}
                    excerpt={note.excerpt?.trim() || null}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {searchSaved.length > 0 ? (
            <div className="space-y-1.5">
              <h2 className="text-sm font-medium text-muted">
                Saved articles & essays
              </h2>
              <ul>
                {searchSaved.map((note) => (
                  <ReadingBriefRow
                    key={readingBriefDedupeKey(note)}
                    href={`/life-lab/${sectionId}/${note.slug}`}
                    title={readingBriefSavedArticleTitle(note)}
                    dateLabel={readingBriefContentDateLabel(note, "short")}
                    excerpt={note.excerpt?.trim() || null}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {searchDaily.length === 0 && searchSaved.length === 0 ? (
            <p className="text-sm text-muted">No matching briefs or articles.</p>
          ) : null}
        </section>
      ) : null}

      {showSaved ? (
        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted">
            Saved articles & essays
          </h2>
          <ul>
            {savedVisible.map((note) => (
              <ReadingBriefRow
                key={readingBriefDedupeKey(note)}
                href={`/life-lab/${sectionId}/${note.slug}`}
                title={readingBriefSavedArticleTitle(note)}
                dateLabel={readingBriefContentDateLabel(note, "short")}
                excerpt={note.excerpt?.trim() || null}
              />
            ))}
          </ul>
          {archive.savedArticles.length > 8 ? (
            <button
              type="button"
              onClick={() => setSavedExpanded((current) => !current)}
              className="min-h-11 pt-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              {savedExpanded
                ? "Show less"
                : `View all · ${archive.savedArticles.length}`}
            </button>
          ) : null}
        </section>
      ) : null}

      {showReference ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary !text-sm !normal-case !tracking-normal">
            <span className="font-medium text-muted">Reference & setup</span>
          </summary>
          <div className="ui-settings-details-body">
            <ul>
              {archive.referenceNotes.map((note) => (
                <ReadingBriefRow
                  key={readingBriefDedupeKey(note)}
                  href={`/life-lab/${sectionId}/${note.slug}`}
                  title={readingBriefReferenceDisplayTitle(note)}
                />
              ))}
            </ul>
          </div>
        </details>
      ) : null}

      {showDiagnostics && listingDiagnostic ? (
        <DebugPanel diagnostic={listingDiagnostic} />
      ) : null}
    </div>
  );
}
