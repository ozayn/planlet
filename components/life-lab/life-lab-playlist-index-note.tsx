import Link from "next/link";

import { MarkdownContent } from "@/components/life-lab/markdown-content";
import type { LifeLabNote } from "@/lib/life-lab/constants";
import {
  formatPlaylistProcessingSummary,
  parsePlaylistIndexNote,
  type PlaylistVideoRow,
  type PlaylistVideoStatus,
} from "@/lib/life-lab/playlist-index";

type LifeLabPlaylistIndexNoteProps = {
  note: LifeLabNote;
};

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
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${className}`}
    >
      {label}
    </span>
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
          Processed {processed} of {total}
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

function VideoRow({ video }: { video: PlaylistVideoRow }) {
  return (
    <li className="rounded-xl border border-border/60 bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {video.episode ? (
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-light">
                Ep {video.episode}
              </span>
            ) : null}
            <StatusBadge status={video.status} />
          </div>
          <p className="text-sm font-medium leading-snug text-foreground">
            {video.title}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {video.noteHref ? (
            <Link
              href={video.noteHref}
              className="rounded-full bg-accent-cream px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-cream/80"
            >
              Open note
            </Link>
          ) : video.status === "pending" ? (
            <span className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted">
              Pending
            </span>
          ) : video.status === "error" ? (
            <span className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted">
              Error
            </span>
          ) : null}
          {video.videoUrl ? (
            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              Open YouTube
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function LifeLabPlaylistIndexNote({ note }: LifeLabPlaylistIndexNoteProps) {
  const display = parsePlaylistIndexNote(note);

  if (!display.parseSucceeded) {
    return <MarkdownContent content={note.content} />;
  }

  const summaryLine = formatPlaylistProcessingSummary(display.summary);

  return (
    <div className="space-y-4">
      <header className="space-y-2 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/life-lab/${note.sectionId}`}
            className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/50 hover:text-foreground"
          >
            Back
          </Link>
          {display.playlistUrl ? (
            <a
              href={display.playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              Open playlist
            </a>
          ) : null}
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
            {display.playlistTitle}
          </h1>
          <p className="text-xs text-muted">
            {[display.channel, display.dateLabel].filter(Boolean).join(" · ")}
          </p>
          <p className="text-sm text-muted">{summaryLine}</p>
        </div>

        <ProgressRow
          processed={display.summary.processed}
          total={display.summary.total}
        />
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Videos</h2>
        <ul className="space-y-2">
          {display.videos.map((video, index) => (
            <VideoRow
              key={`${video.episode ?? index}-${video.title}`}
              video={video}
            />
          ))}
        </ul>
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

      {display.rawVideosTable ? (
        <details className="ui-settings-details group">
          <summary className="ui-settings-details-summary">
            Technical details
          </summary>
          <div className="ui-settings-details-body space-y-3">
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
            <div className="space-y-1">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                Raw table
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border/50 bg-surface p-3 font-mono text-[0.6875rem] leading-relaxed text-muted">
                {display.rawVideosTable}
              </pre>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
