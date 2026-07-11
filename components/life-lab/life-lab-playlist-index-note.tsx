"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  LifeLabPlaylistAnalysis,
  LifeLabPlaylistDebug,
  PlaylistSummarySection,
} from "@/components/life-lab/life-lab-playlist-artifacts";
import { PlaylistVideoThumbnail } from "@/components/life-lab/playlist-video-thumbnail";
import { MarkdownContent } from "@/components/life-lab/markdown-content";
import type {
  LifeLabNote,
  LifeLabNoteDevMeta,
  LifeLabNoteLoadMeta,
  LifeLabNoteSummary,
} from "@/lib/life-lab/constants";
import { summarizePlaylistVideos } from "@/lib/life-lab/playlist-index";
import type { PlaylistAssetsBundle } from "@/lib/life-lab/playlist-assets";
import {
  enrichPlaylistVideoRows,
  formatPlaylistHeaderLine,
  formatPlaylistHeaderState,
  parsePlaylistIndexNote,
  playlistVideoRowTitle,
  shouldShowPlaylistStudyStatus,
  type PlaylistVideoRow,
} from "@/lib/life-lab/playlist-index";
import { filterVisiblePlaylistVideos } from "@/lib/life-lab/playlist-video-availability";
import {
  PLAYLIST_VIDEO_ROW_ICON_CLASS,
  PlaylistSourceIcon,
  PlaylistVideoStatusIcon,
} from "@/lib/life-lab/playlist-video-icons";

type LifeLabPlaylistIndexNoteProps = {
  note: LifeLabNote;
  relatedNotes?: LifeLabNoteSummary[];
  playlistAssets?: (PlaylistAssetsBundle & {
    fromCache: boolean;
    cache?: import("@/lib/life-lab/constants").LifeLabCacheDiagnostic;
  }) | null;
  isAdmin?: boolean;
  dev?: LifeLabNoteDevMeta | null;
  loadMeta?: LifeLabNoteLoadMeta | null;
  technicalProvenance?: string[];
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

function formatDurationLabel(duration: string | null): string | null {
  if (!duration?.trim()) {
    return null;
  }

  const trimmed = duration.trim();
  const clockMatch = trimmed.match(/^(\d+):(\d{2})$/);

  if (clockMatch) {
    const minutes = Number.parseInt(clockMatch[1] ?? "0", 10);

    return `${minutes} min`;
  }

  return trimmed;
}

function durationAriaLabel(duration: string | null): string | undefined {
  const label = formatDurationLabel(duration);

  return label ?? undefined;
}

function DurationCell({ video }: { video: PlaylistVideoRow }) {
  const label = formatDurationLabel(video.duration);
  const sourceIsLink = Boolean(video.videoUrl) && !video.noteHref;

  if (!label && !video.videoUrl) {
    return <span className="text-muted-light">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      {video.videoUrl ? (
        sourceIsLink ? (
          <a
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open video source"
            title="Open video source"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className="inline-flex text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <PlaylistSourceIcon />
          </a>
        ) : (
          <span className="inline-flex text-muted" aria-hidden="true">
            <PlaylistSourceIcon />
          </span>
        )
      ) : null}
      {label ? (
        <span aria-label={durationAriaLabel(video.duration)}>{label}</span>
      ) : (
        <span>—</span>
      )}
    </span>
  );
}

function RowChevron() {
  return (
    <ChevronRight
      className={`${PLAYLIST_VIDEO_ROW_ICON_CLASS} text-muted/0 transition-[color,transform] group-hover:text-muted group-focus-visible:text-muted`}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

function VideoTableHeader() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-[2.25rem_6.5rem_minmax(0,1fr)_5.5rem_2.5rem_1rem] items-center gap-x-3 border-b border-border/60 px-2 pb-2 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light"
    >
      <span>#</span>
      <span />
      <span>Title</span>
      <span>Duration</span>
      <span className="text-center">Status</span>
      <span />
    </div>
  );
}

function VideoTableRow({
  video,
  index,
}: {
  video: PlaylistVideoRow;
  index: number;
}) {
  const title = playlistVideoRowTitle(video);
  const episode = video.episode ?? String(index + 1);
  const clickable = Boolean(video.noteHref);

  const rowClassName = `group grid grid-cols-[2.25rem_6.5rem_minmax(0,1fr)_5.5rem_2.5rem_1rem] items-center gap-x-3 border-b border-border/30 px-2 py-2.5 transition-colors ${
    clickable
      ? "cursor-pointer hover:bg-accent-cream/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border"
      : ""
  }`;

  const rowContent = (
    <>
      <span className="text-xs tabular-nums text-muted-light">{episode}</span>
      <PlaylistVideoThumbnail image={video.thumbnail} title={title} />
      <span className="min-w-0 text-sm font-semibold leading-snug text-foreground">
        {title}
      </span>
      <DurationCell video={video} />
      <span className="flex justify-center">
        <PlaylistVideoStatusIcon status={video.status} />
      </span>
      <span className="flex justify-end">
        {clickable ? <RowChevron /> : null}
      </span>
    </>
  );

  if (clickable && video.noteHref) {
    return (
      <Link
        href={video.noteHref}
        aria-label={`Open note: ${title}`}
        className={rowClassName}
      >
        {rowContent}
      </Link>
    );
  }

  return <div className={rowClassName}>{rowContent}</div>;
}

function VideoTable({ videos }: { videos: PlaylistVideoRow[] }) {
  return (
    <div className="hidden md:block">
      <VideoTableHeader />
      <div>
        {videos.map((video, index) => (
          <VideoTableRow
            key={`${video.episode ?? index}-${video.title}`}
            video={video}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

function MobileVideoRow({ video }: { video: PlaylistVideoRow }) {
  const title = playlistVideoRowTitle(video);
  const duration = formatDurationLabel(video.duration);
  const clickable = Boolean(video.noteHref);
  const metadata = [
    video.videoUrl ? (
      clickable ? (
        <span key="source" className="inline-flex text-muted" aria-hidden="true">
          <PlaylistSourceIcon />
        </span>
      ) : (
        <a
          key="source"
          href={video.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open video source"
          title="Open video source"
          className="inline-flex text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        >
          <PlaylistSourceIcon />
        </a>
      )
    ) : null,
    duration ? (
      <span key="duration" aria-label={durationAriaLabel(video.duration)}>
        {duration}
      </span>
    ) : null,
    <PlaylistVideoStatusIcon key="status" status={video.status} />,
  ]
    .filter(Boolean)
    .map((item, itemIndex) => (
      <span key={itemIndex} className="inline-flex items-center">
        {itemIndex > 0 ? (
          <span aria-hidden="true" className="px-1 text-muted-light">
            ·
          </span>
        ) : null}
        {item}
      </span>
    ));

  const content = (
    <div className="flex items-start gap-3">
      <PlaylistVideoThumbnail
        image={video.thumbnail}
        title={title}
        className="w-[5.5rem]"
      />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {title}
          </p>
          <p className="inline-flex flex-wrap items-center text-xs text-muted">
            {metadata}
          </p>
        </div>
        {clickable ? <RowChevron /> : null}
      </div>
    </div>
  );

  if (!clickable || !video.noteHref) {
    return (
      <li className="rounded-lg border border-border/50 px-3 py-2.5">
        {content}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={video.noteHref}
        aria-label={`Open note: ${title}`}
        className="group block cursor-pointer rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent-cream/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        {content}
      </Link>
    </li>
  );
}

function VideoCards({ videos }: { videos: PlaylistVideoRow[] }) {
  return (
    <ul className="space-y-2 md:hidden">
      {videos.map((video, index) => (
        <MobileVideoRow
          key={`${video.episode ?? index}-${video.title}-mobile`}
          video={video}
        />
      ))}
    </ul>
  );
}

function PlaylistTechnicalDetails({
  sourcePath,
  playlistUrl,
  transcriptStatus,
  noteFilenames,
  rawVideosTable,
}: {
  sourcePath: string | null;
  playlistUrl: string | null;
  transcriptStatus: string | null;
  noteFilenames: Array<string | null>;
  rawVideosTable: string | null;
}) {
  return (
    <div className="space-y-3">
      {sourcePath ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Source path
          </p>
          <p className="break-all font-mono text-xs text-muted">{sourcePath}</p>
        </div>
      ) : null}
      {playlistUrl ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Playlist URL
          </p>
          <p className="break-all font-mono text-xs text-muted">{playlistUrl}</p>
        </div>
      ) : null}
      {transcriptStatus ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Transcript / captions
          </p>
          <p className="text-xs text-muted">{transcriptStatus}</p>
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
          Note filenames
        </p>
        <ul className="space-y-1 font-mono text-xs text-muted">
          {noteFilenames.map((filename, index) => (
            <li key={`${filename ?? "missing"}-${index}`}>{filename ?? "—"}</li>
          ))}
        </ul>
      </div>
      {rawVideosTable ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Raw table
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border/50 bg-surface p-3 font-mono text-[0.6875rem] leading-relaxed text-muted">
            {rawVideosTable}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function LifeLabPlaylistIndexNote({
  note,
  relatedNotes = [],
  playlistAssets = null,
  isAdmin = false,
  dev = null,
  loadMeta = null,
  technicalProvenance = [],
}: LifeLabPlaylistIndexNoteProps) {
  const display = parsePlaylistIndexNote(note);
  const enrichedVideos = enrichPlaylistVideoRows(display.videos, relatedNotes);
  const { visibleVideos, hiddenUnavailableCount } = filterVisiblePlaylistVideos({
    videos: enrichedVideos,
    notes: relatedNotes,
  });
  const visibleSummary = summarizePlaylistVideos(visibleVideos);
  const summaryAsset = playlistAssets?.artifacts.find(
    (asset) => asset.id === "summary" && !asset.unavailable,
  );
  const hasSummaryAsset = Boolean(summaryAsset);
  const fallbackContent = stripUrlsForFallback(
    playlistAssets?.strippedIndexBody ?? note.content,
  );
  const headerLine = formatPlaylistHeaderLine({
    channel: display.channel,
    visibleCount: visibleSummary.total,
    dateLabel: display.dateLabel,
  });
  const headerState = formatPlaylistHeaderState({
    summary: visibleSummary,
    hiddenUnavailableCount,
  });
  const showStudyStatus = shouldShowPlaylistStudyStatus(display.studyStatus);

  if (!display.parseSucceeded) {
    return <MarkdownContent content={fallbackContent} />;
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

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
              {display.playlistTitle}
            </h1>
            {showStudyStatus && display.studyStatus ? (
              <span className="rounded-full border border-border/70 bg-accent-cream/50 px-2.5 py-0.5 text-[0.6875rem] font-medium text-foreground">
                {display.studyStatus}
              </span>
            ) : null}
          </div>

          {headerLine ? (
            <p className="text-sm text-muted">{headerLine}</p>
          ) : null}

          {headerState ? (
            <p className="text-sm text-muted-light">{headerState}</p>
          ) : null}

          {display.focus && !hasSummaryAsset ? (
            <p className="text-sm leading-relaxed text-muted">{display.focus}</p>
          ) : null}
        </div>
      </header>

      {summaryAsset ? <PlaylistSummarySection asset={summaryAsset} /> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Videos</h2>
        <VideoTable videos={visibleVideos} />
        <VideoCards videos={visibleVideos} />
      </section>

      {playlistAssets ? (
        <LifeLabPlaylistAnalysis
          bundle={playlistAssets}
          sectionId={note.sectionId}
          videos={visibleVideos}
          relatedNotes={relatedNotes}
        />
      ) : null}

      <LifeLabPlaylistDebug
        bundle={playlistAssets}
        batchNotes={display.batchNotes}
        hiddenUnavailableCount={hiddenUnavailableCount}
        isAdmin={isAdmin}
        dev={dev}
        loadMeta={loadMeta}
        technicalProvenance={technicalProvenance}
        technicalDetails={
          <PlaylistTechnicalDetails
            sourcePath={display.sourcePath}
            playlistUrl={display.playlistUrl}
            transcriptStatus={display.transcriptStatus}
            noteFilenames={display.videos.map((video) => video.noteFilename)}
            rawVideosTable={display.rawVideosTable}
          />
        }
      />
    </div>
  );
}
