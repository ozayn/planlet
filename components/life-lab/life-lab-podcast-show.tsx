"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mic2,
} from "lucide-react";

import { LifeLabNoteImageFigure } from "@/components/life-lab/life-lab-note-image";
import type { LifeLabNote, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import {
  parsePodcastShowIndex,
  type PodcastEpisodeStatus,
  type PodcastIndexEpisode,
} from "@/lib/life-lab/podcasts";

type LifeLabPodcastShowProps = {
  note: LifeLabNote;
  relatedNotes: LifeLabNoteSummary[];
};

function StatusBadge({ status }: { status: PodcastEpisodeStatus }) {
  const Icon =
    status === "processed"
      ? CheckCircle2
      : status === "error"
        ? AlertCircle
        : Clock3;
  const className =
    status === "error"
      ? "text-danger"
      : status === "processed"
        ? "text-foreground/75"
        : "text-muted";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium capitalize ${className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {status}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function EpisodeArtwork({
  episode,
  relatedNotes,
  showArtwork,
}: {
  episode: PodcastIndexEpisode;
  relatedNotes: LifeLabNoteSummary[];
  showArtwork: ReturnType<typeof resolveLifeLabNoteImage>;
}) {
  const episodeNote = episode.noteRelativePath
    ? relatedNotes.find(
        (item) =>
          item.relativePath.toLowerCase() ===
          episode.noteRelativePath?.toLowerCase(),
      )
    : null;
  const artwork = resolveLifeLabNoteImage(episodeNote?.metadata) ?? showArtwork;

  if (artwork) {
    return (
      <LifeLabNoteImageFigure
        image={artwork}
        variant="thumbnail"
        fallbackTitle={episode.title}
        className="size-10"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border/50 bg-accent-cream/20 text-muted/50"
    >
      <Mic2 className="size-4" />
    </div>
  );
}

function EpisodeRow({
  episode,
  relatedNotes,
  showArtwork,
}: {
  episode: PodcastIndexEpisode;
  relatedNotes: LifeLabNoteSummary[];
  showArtwork: ReturnType<typeof resolveLifeLabNoteImage>;
}) {
  const content = (
    <>
      <EpisodeArtwork
        episode={episode}
        relatedNotes={relatedNotes}
        showArtwork={showArtwork}
      />
      <span className="text-xs tabular-nums text-muted">
        {formatDate(episode.date)}
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 block text-sm font-medium text-foreground">
          {episode.title}
        </span>
      </span>
      <span className="text-xs text-muted">{episode.duration ?? "—"}</span>
      <StatusBadge status={episode.status} />
      <span className="flex justify-end text-muted-light">
        {episode.noteHref ? (
          <ChevronRight className="size-4" aria-hidden="true" />
        ) : (
          "—"
        )}
      </span>
    </>
  );
  const className =
    "grid grid-cols-[2.5rem_6.5rem_minmax(0,1fr)_4.5rem_5.5rem_2rem] items-center gap-3 border-b border-border/35 px-2 py-2.5 transition-colors";

  return episode.noteHref ? (
    <Link
      href={episode.noteHref}
      className={`${className} hover:bg-accent-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border`}
      aria-label={`Open episode note: ${episode.title}`}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function MobileEpisodeCard({
  episode,
  relatedNotes,
  showArtwork,
}: {
  episode: PodcastIndexEpisode;
  relatedNotes: LifeLabNoteSummary[];
  showArtwork: ReturnType<typeof resolveLifeLabNoteImage>;
}) {
  const content = (
    <span className="flex items-start gap-3">
      <EpisodeArtwork
        episode={episode}
        relatedNotes={relatedNotes}
        showArtwork={showArtwork}
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-medium leading-snug text-foreground">
          {episode.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{formatDate(episode.date)}</span>
          {episode.duration ? <span>{episode.duration}</span> : null}
          <StatusBadge status={episode.status} />
        </span>
      </span>
    </span>
  );
  const className =
    "block min-h-11 rounded-lg border border-border/45 px-3 py-3 transition-colors";

  return episode.noteHref ? (
    <Link
      href={episode.noteHref}
      className={`${className} hover:bg-accent-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border`}
      aria-label={`Open episode note: ${episode.title}`}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function LifeLabPodcastShow({
  note,
  relatedNotes,
}: LifeLabPodcastShowProps) {
  const show = parsePodcastShowIndex({ note, relatedNotes });
  const progress =
    show.totalCount > 0
      ? Math.round((show.processedCount / show.totalCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        {show.artwork ? (
          <LifeLabNoteImageFigure
            image={show.artwork}
            variant="thumbnail"
            fallbackTitle={show.title}
            className="size-20 sm:size-24"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-accent-cream/20 text-muted/50 sm:size-24">
            <Mic2 className="size-7" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
            Podcast series
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {show.title}
          </h1>
          {show.description ? (
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted">
              {show.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            {show.totalCount} episodes · {show.processedCount} processed
            {show.pendingCount ? ` · ${show.pendingCount} pending` : ""}
            {show.errorCount ? ` · ${show.errorCount} error` : ""}
            {show.lastUpdated
              ? ` · Updated ${formatDate(show.lastUpdated)}`
              : ""}
          </p>
          <div
            className="mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-border/45"
            role="progressbar"
            aria-label={`${show.title} processing progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-foreground/65"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Link
            href="/life-lab/podcasts"
            className="mt-2 inline-flex min-h-10 items-center text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            Back to Podcasts
          </Link>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Episodes</h2>
        {show.episodes.length > 0 ? (
          <>
            <div className="hidden md:block">
              <div
                aria-hidden="true"
                className="grid grid-cols-[2.5rem_6.5rem_minmax(0,1fr)_4.5rem_5.5rem_2rem] gap-3 border-b border-border/60 px-2 pb-2 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light"
              >
                <span />
                <span>Date</span>
                <span>Episode</span>
                <span>Duration</span>
                <span>Status</span>
                <span>Note</span>
              </div>
              {show.episodes.map((episode, index) => (
                <EpisodeRow
                  key={`${episode.date ?? index}-${episode.title}`}
                  episode={episode}
                  relatedNotes={relatedNotes}
                  showArtwork={show.artwork}
                />
              ))}
            </div>
            <div className="space-y-2 md:hidden">
              {show.episodes.map((episode, index) => (
                <MobileEpisodeCard
                  key={`${episode.date ?? index}-${episode.title}`}
                  episode={episode}
                  relatedNotes={relatedNotes}
                  showArtwork={show.artwork}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            No podcast episodes have been processed yet.
          </p>
        )}
      </section>
    </div>
  );
}
