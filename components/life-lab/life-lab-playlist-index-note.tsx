import Link from "next/link";

import { LifeLabNoteImageFigure } from "@/components/life-lab/life-lab-note-image";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import type { LifeLabNote, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  enrichPlaylistVideoRows,
  parsePlaylistIndexNote,
  type PlaylistIndexSummary,
  type PlaylistVideoRow,
  type PlaylistVideoStatus,
} from "@/lib/life-lab/playlist-index";

type LifeLabPlaylistIndexNoteProps = {
  note: LifeLabNote;
  relatedNotes?: LifeLabNoteSummary[];
};

function stripUrlsForFallback(content: string): string {
  return content
    .replace(
      /https?:\/\/(?:www\.)?(?:youtube\.com\/[^\s)|]+|youtu\.be\/[^\s)|]+)/gi,
      "",
    )
    .replace(/\|\s*https?:\/\/[^\|]+\s*\|/g, "| — |")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function StatusBadge({ status }: { status: PlaylistVideoStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const className =
    status === "processed"
      ? "border-border/70 bg-accent-cream/70 text-foreground"
      : status === "error"
        ? "border-border/80 text-foreground"
        : "border-border/70 text-muted";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        emphasis
          ? "border-border/80 bg-accent-cream/40"
          : "border-border/60 bg-surface"
      }`}
    >
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function SummaryCards({ summary }: { summary: PlaylistIndexSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard label="Total videos" value={summary.total} emphasis />
      <StatCard label="Processed" value={summary.processed} />
      <StatCard label="Pending" value={summary.pending} />
      <StatCard label="Errors" value={summary.error} />
    </div>
  );
}

function ProgressRow({
  processed,
  total,
}: {
  processed: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          {processed} of {total} processed
        </span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-border/40"
        role="progressbar"
        aria-valuenow={processed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Processed ${processed} of ${total} videos`}
      >
        <div
          className="h-full rounded-full bg-accent-cream transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function YoutubeLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 p-1.5 text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
      aria-label="Open on YouTube"
      title="Open on YouTube"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
      </svg>
    </a>
  );
}

function NoteAction({ video }: { video: PlaylistVideoRow }) {
  if (video.noteHref) {
    return (
      <Link
        href={video.noteHref}
        className="inline-flex rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
      >
        Open note
      </Link>
    );
  }

  if (video.status === "pending") {
    return (
      <span className="text-xs font-medium text-muted">Pending</span>
    );
  }

  return (
    <span className="text-xs font-medium text-muted">No note yet</span>
  );
}

function VideoThumbnail({ video }: { video: PlaylistVideoRow }) {
  if (!video.thumbnail) {
    return null;
  }

  return (
    <LifeLabNoteImageFigure
      image={video.thumbnail}
      variant="thumbnail"
      fallbackTitle={video.title}
    />
  );
}

function VideoTitle({ video }: { video: PlaylistVideoRow }) {
  if (video.noteHref) {
    return (
      <Link
        href={video.noteHref}
        className="font-medium text-foreground transition-colors hover:text-muted"
      >
        {video.title}
      </Link>
    );
  }

  return <span className="font-medium text-foreground">{video.title}</span>;
}

function VideoTable({ videos }: { videos: PlaylistVideoRow[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-light">
            <th className="border-b border-border/60 pb-2 pr-3 font-semibold">#</th>
            <th className="border-b border-border/60 pb-2 pr-3 font-semibold">Title</th>
            <th className="border-b border-border/60 pb-2 pr-3 font-semibold">Duration</th>
            <th className="border-b border-border/60 pb-2 pr-3 font-semibold">Status</th>
            <th className="border-b border-border/60 pb-2 font-semibold">Note</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video, index) => (
            <tr key={`${video.episode ?? index}-${video.title}`} className="align-top">
              <td className="border-b border-border/40 py-3 pr-3 text-muted">
                {video.episode ?? index + 1}
              </td>
              <td className="border-b border-border/40 py-3 pr-3">
                <div className="flex min-w-0 items-start gap-2">
                  <VideoThumbnail video={video} />
                  <div className="min-w-0 flex-1 leading-snug">
                    <VideoTitle video={video} />
                  </div>
                  {video.videoUrl ? <YoutubeLink href={video.videoUrl} /> : null}
                </div>
              </td>
              <td className="border-b border-border/40 py-3 pr-3 text-muted">
                {video.duration ?? "—"}
              </td>
              <td className="border-b border-border/40 py-3 pr-3">
                <StatusBadge status={video.status} />
              </td>
              <td className="border-b border-border/40 py-3">
                <NoteAction video={video} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VideoCards({ videos }: { videos: PlaylistVideoRow[] }) {
  return (
    <ul className="space-y-2 md:hidden">
      {videos.map((video, index) => (
        <li
          key={`${video.episode ?? index}-${video.title}-mobile`}
          className="rounded-xl border border-border/60 bg-surface p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <VideoThumbnail video={video} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-light">
                  {video.episode ? `Ep ${video.episode}` : `#${index + 1}`}
                </span>
                <StatusBadge status={video.status} />
                {video.duration ? (
                  <span className="text-[0.6875rem] text-muted">{video.duration}</span>
                ) : null}
              </div>
              <p className="text-sm leading-snug">
                <VideoTitle video={video} />
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <NoteAction video={video} />
              {video.videoUrl ? <YoutubeLink href={video.videoUrl} /> : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LifeLabPlaylistIndexNote({
  note,
  relatedNotes = [],
}: LifeLabPlaylistIndexNoteProps) {
  const display = parsePlaylistIndexNote(note);
  const videos = enrichPlaylistVideoRows(display.videos, relatedNotes);

  if (!display.parseSucceeded) {
    return <MarkdownContent content={stripUrlsForFallback(note.content)} />;
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/life-lab/${note.sectionId}`}
            className="text-xs font-medium text-muted-light transition-colors hover:text-muted"
          >
            ← Back to section
          </Link>
          {display.playlistUrl ? (
            <a
              href={display.playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              Open playlist
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
              {display.playlistTitle}
            </h1>
            {display.studyStatus ? (
              <span className="rounded-full border border-border/70 bg-accent-cream/50 px-2.5 py-0.5 text-[0.6875rem] font-medium text-foreground">
                {display.studyStatus}
              </span>
            ) : null}
          </div>

          <p className="text-xs text-muted">
            {[
              display.channel,
              display.dateLabel,
              `${display.summary.total} videos`,
              `${display.summary.processed} processed`,
              display.summary.pending > 0
                ? `${display.summary.pending} pending`
                : null,
              display.summary.error > 0
                ? `${display.summary.error} error${display.summary.error === 1 ? "" : "s"}`
                : null,
              display.summary.skipped > 0
                ? `${display.summary.skipped} skipped`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {display.focus ? (
            <p className="text-sm leading-relaxed text-muted">{display.focus}</p>
          ) : null}
        </div>

        <SummaryCards summary={display.summary} />

        <ProgressRow
          processed={display.summary.processed}
          total={display.summary.total}
        />
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Videos</h2>
        <VideoTable videos={videos} />
        <VideoCards videos={videos} />
      </section>

      {display.batchNotes.length > 0 ? (
        <section className="rounded-xl border border-border/60 bg-accent-cream/20 p-3 md:p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Batch notes
          </h2>
          <ul className="space-y-1.5">
            {display.batchNotes.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm leading-relaxed text-foreground"
              >
                <span className="shrink-0 text-muted" aria-hidden="true">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="ui-settings-details group">
        <summary className="ui-settings-details-summary">
          Technical details
        </summary>
        <div className="ui-settings-details-body space-y-3">
          {display.sourcePath ? (
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                Source path
              </p>
              <p className="break-all font-mono text-xs text-muted">
                {display.sourcePath}
              </p>
            </div>
          ) : null}
          {display.playlistUrl ? (
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                Playlist URL
              </p>
              <p className="break-all font-mono text-xs text-muted">
                {display.playlistUrl}
              </p>
            </div>
          ) : null}
          {display.transcriptStatus ? (
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                Transcript / captions
              </p>
              <p className="text-xs text-muted">{display.transcriptStatus}</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
              Note filenames
            </p>
            <ul className="space-y-1 font-mono text-xs text-muted">
              {display.videos.map((video) => (
                <li key={`${video.title}-filename`}>
                  {video.noteFilename ?? "—"}
                </li>
              ))}
            </ul>
          </div>
          {display.rawVideosTable ? (
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                Raw table
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border/50 bg-surface p-3 font-mono text-[0.6875rem] leading-relaxed text-muted">
                {display.rawVideosTable}
              </pre>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
