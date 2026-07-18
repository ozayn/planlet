"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { LifeLabPodcastArtwork } from "@/components/life-lab/life-lab-podcast-artwork";
import type { LifeLabNote, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import {
  parsePodcastShowIndex,
  type PodcastEpisodeStatus,
  type PodcastIndexEpisode,
} from "@/lib/life-lab/podcasts";
import { LIFE_LAB_UI_LABELS } from "@/lib/life-lab/ui-labels";

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
      ? "border-danger/30 bg-danger/10 text-danger"
      : status === "processed"
        ? "border-border/60 bg-accent-cream/45 text-foreground/75"
        : "border-border/60 bg-surface text-muted";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium capitalize ${className}`}
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

  return (
    <LifeLabPodcastArtwork
      image={artwork}
      title={episode.title}
      className="size-12"
    />
  );
}

function EpisodeRow({
  episode,
}: {
  episode: PodcastIndexEpisode;
}) {
  const content = (
    <>
      <span className="text-xs tabular-nums text-muted">
        {formatDate(episode.date)}
      </span>
      <span className="min-w-[20rem]">
        <span className="line-clamp-3 block text-sm font-medium leading-snug text-foreground">
          {episode.title}
        </span>
      </span>
      <span className="text-xs text-muted">{episode.duration ?? "—"}</span>
      <StatusBadge status={episode.status} />
      <span className="text-xs font-medium text-muted">
        {episode.noteHref ? "Open note" : "—"}
      </span>
    </>
  );
  const className =
    "grid min-w-[44rem] grid-cols-[6.5rem_minmax(20rem,1fr)_5rem_6.5rem_5rem] items-center gap-3 border-b border-border/35 px-2 py-2.5 transition-colors";

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
      <header className="flex items-start gap-3 sm:gap-5">
        <LifeLabPodcastArtwork
          image={show.artwork}
          title={show.title}
          className="size-24 sm:size-32"
          eager
        />
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
            {LIFE_LAB_UI_LABELS.backToPodcasts}
          </Link>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Episodes</h2>
        {show.episodes.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <div
                aria-hidden="true"
                className="grid min-w-[44rem] grid-cols-[6.5rem_minmax(20rem,1fr)_5rem_6.5rem_5rem] gap-3 border-b border-border/60 px-2 pb-2 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light"
              >
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
