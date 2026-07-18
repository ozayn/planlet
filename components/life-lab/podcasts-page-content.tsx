"use client";

import Link from "next/link";
import { Mic2 } from "lucide-react";
import { useMemo, useState } from "react";

import { LifeLabNoteImageFigure } from "@/components/life-lab/life-lab-note-image";
import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  isPodcastEpisodeNote,
  isPodcastShowIndex,
  parsePodcastShowIndex,
  type PodcastEpisodeStatus,
} from "@/lib/life-lab/podcasts";

type PodcastsPageContentProps = {
  notes: LifeLabNoteSummary[];
  searchQuery?: string;
};

type StatusFilter = "all" | PodcastEpisodeStatus;
type DateFilter = "all" | "month" | "year";

function episodeMatchesDateFilter(
  dateValue: string | null,
  filter: DateFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (!dateValue) {
    return false;
  }

  const date = new Date(`${dateValue}T12:00:00Z`);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    (filter === "year" || date.getUTCMonth() === now.getUTCMonth())
  );
}

function formatUpdated(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function PodcastArtwork({
  show,
}: {
  show: ReturnType<typeof parsePodcastShowIndex>;
}) {
  if (show.artwork) {
    return (
      <LifeLabNoteImageFigure
        image={show.artwork}
        variant="thumbnail"
        fallbackTitle={show.title}
        className="size-16 sm:size-[4.5rem]"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-16 shrink-0 items-center justify-center rounded-md border border-border/50 bg-accent-cream/20 text-muted/55 sm:size-[4.5rem]"
    >
      <Mic2 className="size-5" />
    </div>
  );
}

function PodcastShowCard({
  show,
}: {
  show: ReturnType<typeof parsePodcastShowIndex>;
}) {
  const completedPercent =
    show.totalCount > 0
      ? Math.round((show.processedCount / show.totalCount) * 100)
      : 0;
  const status = [
    `${show.processedCount} processed`,
    show.pendingCount > 0 ? `${show.pendingCount} pending` : null,
    show.errorCount > 0 ? `${show.errorCount} error` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const updated = formatUpdated(show.lastUpdated);

  return (
    <li>
      <Link
        href={`/life-lab/podcasts/${show.indexSlug}`}
        className="group flex min-h-11 items-start gap-3 rounded-xl border border-border/55 bg-surface px-3 py-3 transition-colors hover:bg-accent-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <PodcastArtwork show={show} />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-1 text-sm font-semibold text-foreground">
            {show.title}
          </h2>
          {show.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
              {show.description}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            {show.totalCount} {show.totalCount === 1 ? "episode" : "episodes"}
            {status ? ` · ${status}` : ""}
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/45"
            role="progressbar"
            aria-label={`${show.title} processing progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completedPercent}
          >
            <div
              className="h-full rounded-full bg-foreground/65"
              style={{ width: `${completedPercent}%` }}
            />
          </div>
          {updated ? (
            <p className="mt-1 text-[0.6875rem] text-muted-light">
              Updated {updated}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function PodcastsPageContent({
  notes,
  searchQuery = "",
}: PodcastsPageContentProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilter, setShowFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const allShows = useMemo(
    () =>
      notes
        .filter(isPodcastShowIndex)
        .map((note) => parsePodcastShowIndex({ note, relatedNotes: notes }))
        .sort((left, right) => left.title.localeCompare(right.title)),
    [notes],
  );
  const shows = useMemo(
    () =>
      allShows
        .filter((show) =>
          showFilter === "all" ? true : show.indexSlug === showFilter,
        )
        .filter((show) =>
          statusFilter === "all"
            ? true
            : show.episodes.some((episode) => episode.status === statusFilter),
        )
        .filter((show) =>
          dateFilter === "all"
            ? true
            : show.episodes.some((episode) =>
                episodeMatchesDateFilter(episode.date, dateFilter),
              ),
        ),
    [allShows, dateFilter, showFilter, statusFilter],
  );
  const searching = Boolean(searchQuery.trim());

  if (searching) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Search results</h2>
        <ul className="divide-y divide-border/40">
          {notes.map((note) => {
            const series = isPodcastShowIndex(note);
            const episode = isPodcastEpisodeNote(note);

            if (!series && !episode) {
              return null;
            }

            return (
              <li key={note.fileId}>
                <Link
                  href={`/life-lab/podcasts/${note.slug}`}
                  className="block min-h-11 py-2.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
                    {series ? "Podcast series" : "Podcast episode"}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-foreground">
                    {note.metadata?.episode_title ?? note.title}
                  </span>
                  {note.excerpt ? (
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted">
                      {note.excerpt}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-4" data-podcasts-layout="series-v1">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {(["all", "processed", "pending", "error"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-medium capitalize transition-colors ${
              statusFilter === status
                ? "bg-foreground text-background"
                : "bg-accent-cream/45 text-muted hover:text-foreground"
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {allShows.length > 1 ? (
          <label className="text-xs text-muted">
            <span className="sr-only">Show</span>
            <select
              value={showFilter}
              onChange={(event) => setShowFilter(event.target.value)}
              className="min-h-10 rounded-full border border-border/70 bg-transparent px-3"
              aria-label="Filter by podcast show"
            >
              <option value="all">All shows</option>
              {allShows.map((show) => (
                <option key={show.indexSlug} value={show.indexSlug}>
                  {show.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-xs text-muted">
          <span className="sr-only">Publication date</span>
          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(event.target.value as DateFilter)
            }
            className="min-h-10 rounded-full border border-border/70 bg-transparent px-3"
            aria-label="Filter by publication date"
          >
            <option value="all">All dates</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </label>
      </div>

      {shows.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shows.map((show) => (
            <PodcastShowCard key={show.indexSlug} show={show} />
          ))}
        </ul>
      ) : allShows.length === 0 ? (
        <p className="text-sm text-muted">
          No podcast show indexes were found.
        </p>
      ) : (
        <p className="text-sm text-muted">
          No podcast series match these filters.
        </p>
      )}
    </div>
  );
}
