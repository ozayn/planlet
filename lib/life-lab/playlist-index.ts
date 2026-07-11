import type {
  LifeLabNote,
  LifeLabNoteMetadata,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import { isLifeLabPlaylistIndex } from "@/lib/life-lab/file-classification";
import { isPlaylistAssetRelativePath } from "@/lib/life-lab/playlist-asset-paths";
import { noteContentDateValue } from "@/lib/life-lab/browse";
import {
  formatCollectionDisplayTitle,
  listCollectionContentNotes,
} from "@/lib/life-lab/collection";
import {
  driveRelativePathToSlug,
  relativePathFilename,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";
import {
  formatCount,
  normalizeAccidentalAllCapsTitle,
} from "@/lib/life-lab/collection-metadata";
import { filterVisiblePlaylistVideos } from "@/lib/life-lab/playlist-video-availability";
import { cleanLifeLabExcerpt } from "@/lib/life-lab/excerpt";
import { resolvePlaylistVideoRowThumbnail } from "@/lib/life-lab/playlist-video-thumbnail";
import type { ResolvedLifeLabNoteImage } from "@/lib/life-lab/note-image";
import { isInternalPlaylistTitle } from "@/lib/life-lab/youtube-browse";
import {
  cleanPlaylistVideoDisplayTitles,
  cleanYoutubePlaylistVideoTitle,
  type PlaylistTitleCleanupContext,
} from "@/lib/life-lab/playlist-title-cleanup";

export type PlaylistVideoStatus = "processed" | "pending" | "skipped" | "error";

export type PlaylistVideoRow = {
  episode: string | null;
  title: string;
  displayTitle?: string;
  status: PlaylistVideoStatus;
  duration: string | null;
  videoUrl: string | null;
  noteFilename: string | null;
  noteSlug: string | null;
  noteHref: string | null;
  thumbnail?: ResolvedLifeLabNoteImage;
};

export type PlaylistIndexSummary = {
  total: number;
  processed: number;
  pending: number;
  skipped: number;
  error: number;
};

export type PlaylistIndexDisplay = {
  playlistTitle: string;
  channel: string | null;
  dateLabel: string | null;
  playlistUrl: string | null;
  focus: string | null;
  studyStatus: string | null;
  transcriptStatus: string | null;
  sourcePath: string | null;
  summary: PlaylistIndexSummary;
  videos: PlaylistVideoRow[];
  batchNotes: string[];
  rawVideosTable: string | null;
  parseSucceeded: boolean;
};

export type PlaylistVideoNavLink = {
  href: string | null;
  title: string;
  status: PlaylistVideoStatus;
  episode: string | null;
};

export type PlaylistVideoNavigation = {
  playlistIndexHref: string;
  playlistTitle: string;
  previous: PlaylistVideoNavLink | null;
  next: PlaylistVideoNavLink | null;
  currentEpisode: string | null;
};

const PLAYLIST_VIDEO_STATUSES = new Set<PlaylistVideoStatus>([
  "processed",
  "pending",
  "skipped",
  "error",
]);

const VIDEOS_HEADING_PATTERN = /^##\s+(?:videos|video list)\s*$/im;
const PLAYLIST_SUMMARY_HEADING_PATTERN = /^##\s+playlist summary\s*$/im;

const BATCH_NOTES_HEADING_PATTERN = /^##\s+batch notes\s*$/im;

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

function isTableSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}/.test(line.trim());
}

function normalizeHeaderLabel(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim();
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeaderLabel);

  for (const alias of aliases) {
    const index = normalized.findIndex(
      (header) => header === alias || header.includes(alias),
    );

    if (index !== -1) {
      return index;
    }
  }

  return -1;
}

function normalizeStatus(value: string): PlaylistVideoStatus | null {
  const normalized = value.trim().toLowerCase();

  return PLAYLIST_VIDEO_STATUSES.has(normalized as PlaylistVideoStatus)
    ? (normalized as PlaylistVideoStatus)
    : null;
}

function stripMarkdownLink(value: string): string {
  const linkMatch = value.match(/^\[([^\]]*)\]\(([^)]+)\)$/);

  if (linkMatch) {
    return linkMatch[2]?.trim() ?? value.trim();
  }

  return value.trim();
}

function cleanCellValue(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "-" || trimmed === "—" || trimmed === "n/a") {
    return null;
  }

  return stripMarkdownLink(trimmed);
}

export function resolveYoutubeVideoNoteSlug(noteFilename: string): string | null {
  const cleaned = cleanCellValue(noteFilename);

  if (!cleaned) {
    return null;
  }

  let relativePath = cleaned.replace(/^\.?\//, "");

  if (!relativePath.toLowerCase().endsWith(".md")) {
    relativePath = `${relativePath}.md`;
  }

  if (!relativePath.includes("/")) {
    relativePath = `videos/${relativePath}`;
  }

  if (!relativePath.toLowerCase().startsWith("videos/")) {
    return null;
  }

  return driveRelativePathToSlug(relativePath);
}

export function buildYoutubeVideoNoteHref(
  sectionId: LifeLabSectionId,
  noteFilename: string,
): string | null {
  const slug = resolveYoutubeVideoNoteSlug(noteFilename);

  return slug ? `/life-lab/${sectionId}/${slug}` : null;
}

function extractSectionByHeading(
  body: string,
  headingPattern: RegExp,
): string | null {
  const match = headingPattern.exec(body);

  if (!match || match.index === undefined) {
    return null;
  }

  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextHeading = rest.search(/^##\s+/m);
  const section = (
    nextHeading === -1 ? rest : rest.slice(0, nextHeading)
  ).trim();

  return section || null;
}

function extractFirstMarkdownTable(section: string): string | null {
  const lines = section.split("\n");
  const tableLines: string[] = [];
  let collecting = false;

  for (const line of lines) {
    if (isTableRow(line)) {
      collecting = true;
      tableLines.push(line);
      continue;
    }

    if (collecting) {
      break;
    }
  }

  return tableLines.length >= 2 ? tableLines.join("\n") : null;
}

function tableHasPlaylistColumns(tableMarkdown: string): boolean {
  const headerLine = tableMarkdown.split("\n").find((line) => isTableRow(line));

  if (!headerLine) {
    return false;
  }

  const headers = parseTableRow(headerLine);
  const statusIndex = findColumnIndex(headers, ["status"]);
  const titleIndex = findColumnIndex(headers, ["video title", "title"]);
  const urlIndex = findColumnIndex(headers, ["video url", "url", "youtube"]);
  const noteIndex = findColumnIndex(headers, [
    "note filename",
    "note file",
    "note",
    "filename",
  ]);

  return statusIndex !== -1 && (titleIndex !== -1 || urlIndex !== -1 || noteIndex !== -1);
}

export function hasPlaylistVideosTable(body: string): boolean {
  const videosSection = extractSectionByHeading(body, VIDEOS_HEADING_PATTERN);

  if (!videosSection) {
    return false;
  }

  const table = extractFirstMarkdownTable(videosSection);

  return Boolean(table && tableHasPlaylistColumns(table));
}

function parsePlaylistVideosTable(
  tableMarkdown: string,
  sectionId: LifeLabSectionId,
): PlaylistVideoRow[] {
  const lines = tableMarkdown.split("\n").filter((line) => isTableRow(line));
  const headerLine = lines[0];

  if (!headerLine) {
    return [];
  }

  const headers = parseTableRow(headerLine);
  const statusIndex = findColumnIndex(headers, ["status"]);
  const episodeIndex = findColumnIndex(headers, ["episode", "ep", "#"]);
  const titleIndex = findColumnIndex(headers, ["video title", "title"]);
  const urlIndex = findColumnIndex(headers, ["video url", "url", "youtube"]);
  const durationIndex = findColumnIndex(headers, ["duration", "length", "runtime"]);
  const noteIndex = findColumnIndex(headers, [
    "note filename",
    "note file",
    "note",
    "filename",
  ]);

  if (statusIndex === -1) {
    return [];
  }

  const videos: PlaylistVideoRow[] = [];

  for (const rowLine of lines.slice(1)) {
    if (isTableSeparator(rowLine)) {
      continue;
    }

    const cells = parseTableRow(rowLine);
    const status = normalizeStatus(cells[statusIndex] ?? "");

    if (!status) {
      continue;
    }

    const title =
      cleanCellValue(cells[titleIndex]) ??
      cleanCellValue(cells[urlIndex]) ??
      "Untitled video";
    const noteFilename = cleanCellValue(cells[noteIndex]);
    const noteSlug = noteFilename
      ? resolveYoutubeVideoNoteSlug(noteFilename)
      : null;

    videos.push({
      episode: cleanCellValue(cells[episodeIndex]),
      title,
      status,
      duration: cleanCellValue(cells[durationIndex]),
      videoUrl: cleanCellValue(cells[urlIndex]),
      noteFilename,
      noteSlug,
      noteHref:
        status === "processed" && noteSlug
          ? `/life-lab/${sectionId}/${noteSlug}`
          : null,
    });
  }

  return videos;
}

export function playlistVideoRowTitle(video: PlaylistVideoRow): string {
  return video.displayTitle ?? video.title;
}

export function applyPlaylistVideoDisplayTitles(
  videos: PlaylistVideoRow[],
  context: PlaylistTitleCleanupContext,
): PlaylistVideoRow[] {
  const displayTitles = cleanPlaylistVideoDisplayTitles(
    videos.map((video) => video.title),
    context,
  );

  return videos.map((video, index) => {
    const displayTitle = displayTitles[index] ?? video.title;

    return displayTitle === video.title
      ? video
      : { ...video, displayTitle };
  });
}

export function enrichPlaylistVideoRows(
  videos: PlaylistVideoRow[],
  notes: LifeLabNoteSummary[],
): PlaylistVideoRow[] {
  const notesBySlug = new Map(notes.map((note) => [note.slug, note]));

  return videos.map((video) => {
    const note = video.noteSlug ? notesBySlug.get(video.noteSlug) : undefined;
    const thumbnail = resolvePlaylistVideoRowThumbnail({
      metadata: note?.metadata,
      videoUrl: video.videoUrl,
      title: video.displayTitle ?? video.title,
    });

    return thumbnail ? { ...video, thumbnail } : video;
  });
}

function extractBatchNotes(body: string): string[] {
  const section = extractSectionByHeading(body, BATCH_NOTES_HEADING_PATTERN);

  if (!section) {
    return [];
  }

  return section
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function extractPlaylistFocus(
  body: string,
  metadata?: LifeLabNoteMetadata,
): string | null {
  if (metadata?.summary?.trim()) {
    return cleanLifeLabExcerpt(metadata.summary, 220);
  }

  const summarySection = extractSectionByHeading(
    body,
    PLAYLIST_SUMMARY_HEADING_PATTERN,
  );

  if (summarySection) {
    return cleanLifeLabExcerpt(summarySection, 220);
  }

  const labeledMatch = body.match(
    /^\*\*Playlist summary\*\*\s*\n+([\s\S]*?)(?=\n##\s+|\n\*\*[A-Za-z ]+\*\*|\n---\s*$|$)/im,
  );

  if (labeledMatch?.[1]?.trim()) {
    return cleanLifeLabExcerpt(labeledMatch[1].trim(), 220);
  }

  const withoutHeading = body.replace(/^#\s+.+\n+/, "").trim();
  const firstParagraph = withoutHeading
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block &&
        !block.startsWith("#") &&
        !/^\*\*[A-Za-z ]+\*\*\s*$/.test(block),
    );

  return firstParagraph ? cleanLifeLabExcerpt(firstParagraph, 220) : null;
}

function formatStudyStatusLabel(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractTranscriptStatus(batchNotes: string[]): string | null {
  if (batchNotes.length === 0) {
    return null;
  }

  const joined = batchNotes.join(" ").toLowerCase();

  if (joined.includes("transcript") && joined.includes("caption")) {
    if (joined.includes("not included") || joined.includes("no transcript")) {
      return "Captions used · transcripts not included";
    }

    return "Captions and transcripts noted";
  }

  if (joined.includes("caption")) {
    return "Captions used";
  }

  if (joined.includes("transcript")) {
    return joined.includes("not included")
      ? "Transcripts not included"
      : "Transcripts included";
  }

  return null;
}

function hasPlaylistSummaryAndVideoList(body: string): boolean {
  const hasPlaylistSummary =
    PLAYLIST_SUMMARY_HEADING_PATTERN.test(body) ||
    /\*\*Playlist summary\*\*/i.test(body);
  const hasVideoList =
    VIDEOS_HEADING_PATTERN.test(body) || /\*\*Video list\*\*/i.test(body);

  return hasPlaylistSummary && hasVideoList;
}

function extractPlaylistUrl(
  body: string,
  metadata?: LifeLabNoteMetadata,
): string | null {
  if (metadata?.playlist_url?.trim()) {
    return metadata.playlist_url.trim();
  }

  const labeledMatch = body.match(
    /^\*\*Playlist URL\*\*\s*\n+(https?:\/\/\S+)/im,
  );

  if (labeledMatch?.[1]) {
    return labeledMatch[1].trim();
  }

  const markdownLinkMatch = body.match(
    /\[(?:Open playlist|Playlist URL|Playlist)\]\((https?:\/\/[^)]+)\)/i,
  );

  if (markdownLinkMatch?.[1]) {
    return markdownLinkMatch[1].trim();
  }

  const inlineMatch = body.match(
    /(https?:\/\/(?:www\.)?(?:youtube\.com\/playlist\?list=[^\s)]+|youtu\.be\/[^\s)]+))/i,
  );

  return inlineMatch?.[1]?.trim() ?? null;
}

export function summarizePlaylistVideos(
  videos: PlaylistVideoRow[],
): PlaylistIndexSummary {
  return videos.reduce<PlaylistIndexSummary>(
    (summary, video) => {
      summary.total += 1;
      summary[video.status] += 1;
      return summary;
    },
    {
      total: 0,
      processed: 0,
      pending: 0,
      skipped: 0,
      error: 0,
    },
  );
}

export function formatCompactPlaylistMetadata(
  summary: PlaylistIndexSummary,
): string {
  const parts = [formatCount(summary.total, "video", "videos")];

  if (summary.pending > 0) {
    parts.push(formatCount(summary.pending, "pending", "pending"));
  }

  if (summary.error > 0) {
    parts.push(formatCount(summary.error, "error", "errors"));
  }

  if (summary.skipped > 0) {
    parts.push(formatCount(summary.skipped, "skipped", "skipped"));
  }

  return parts.join(" · ");
}

export function formatPlaylistHeaderLine(input: {
  channel: string | null;
  visibleCount: number;
  dateLabel: string | null;
}): string {
  const parts: string[] = [];

  if (input.channel) {
    parts.push(input.channel);
  }

  parts.push(formatCount(input.visibleCount, "video", "videos"));

  if (input.dateLabel) {
    parts.push(`Updated ${input.dateLabel}`);
  }

  return parts.join(" · ");
}

export function formatPlaylistHeaderState(input: {
  summary: PlaylistIndexSummary;
  hiddenUnavailableCount: number;
}): string | null {
  const parts: string[] = [];

  if (
    input.summary.processed > 0 &&
    (input.hiddenUnavailableCount > 0 ||
      input.summary.pending > 0 ||
      input.summary.error > 0)
  ) {
    parts.push(`${input.summary.processed} processed`);
  }

  if (input.hiddenUnavailableCount > 0) {
    parts.push(
      input.hiddenUnavailableCount === 1
        ? "1 unavailable"
        : `${input.hiddenUnavailableCount} unavailable`,
    );
  }

  if (input.summary.pending > 0) {
    parts.push(formatCount(input.summary.pending, "pending", "pending"));
  }

  if (input.summary.error > 0) {
    parts.push(formatCount(input.summary.error, "error", "errors"));
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function shouldShowPlaylistStudyStatus(
  studyStatus: string | null | undefined,
): boolean {
  const normalized = studyStatus?.trim().toLowerCase();

  return Boolean(normalized && normalized !== "new");
}

export function formatPlaylistProcessingSummary(
  summary: PlaylistIndexSummary,
): string {
  const parts = [
    `${summary.processed} processed`,
    `${summary.pending} pending`,
  ];

  if (summary.skipped > 0) {
    parts.push(`${summary.skipped} skipped`);
  }

  parts.push(`${summary.error} error${summary.error === 1 ? "" : "s"}`);

  return parts.join(" · ");
}

function isCollectionIndexFilename(filename: string): boolean {
  const lower = filename.toLowerCase();

  return (
    lower === "index.md" ||
    lower.endsWith("-index.md") ||
    lower === "playlist-index.md" ||
    lower === "collection-index.md"
  );
}

function hasCollectionIndexFilename(
  relativePath: string | undefined,
): boolean {
  if (!relativePath) {
    return false;
  }

  return isCollectionIndexFilename(relativePathFilename(relativePath));
}

export function isPlaylistIndexSummaryRecord(
  record: Pick<
    LifeLabNoteSummary,
    "relativePath" | "subfolderLabel" | "metadata"
  >,
): boolean {
  return isLifeLabPlaylistIndex({
    sectionId: "youtube-learning",
    relativePath: record.relativePath ?? "",
    subfolderLabel: record.subfolderLabel,
    metadata: record.metadata,
    title: record.relativePath,
  });
}

export function isPlaylistIndexNote(input: {
  sectionId?: LifeLabSectionId;
  relativePath?: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
  content?: string;
}): boolean {
  const relativePath = input.relativePath ?? "";

  if (isPlaylistAssetRelativePath(relativePath)) {
    return false;
  }

  if (
    !isLifeLabPlaylistIndex({
      sectionId: input.sectionId,
      relativePath,
      subfolderLabel: input.subfolderLabel,
      metadata: input.metadata,
    })
  ) {
    if (input.content && hasPlaylistVideosTable(input.content)) {
      return true;
    }

    if (input.content && hasPlaylistSummaryAndVideoList(input.content)) {
      return true;
    }

    const playlistTitle = input.metadata?.playlist?.trim();

    if (
      input.sectionId === "youtube-learning" &&
      input.metadata?.source === "youtube" &&
      playlistTitle &&
      !isInternalPlaylistTitle(playlistTitle) &&
      !isYoutubeVideoNote({
        relativePath,
        subfolderLabel: input.subfolderLabel ?? null,
        metadata: input.metadata,
      })
    ) {
      return true;
    }

    return false;
  }

  return true;
}

export function parsePlaylistIndexNote(note: LifeLabNote): PlaylistIndexDisplay {
  const { metadata, content, title, dateLabel, relativePath, sectionId } = note;
  const playlistTitle =
    metadata?.playlist?.trim() ??
    titleFromMarkdownHeading(content) ??
    title;
  const videosSection = extractSectionByHeading(content, VIDEOS_HEADING_PATTERN);
  const rawVideosTable = videosSection
    ? extractFirstMarkdownTable(videosSection)
    : null;
  const videos = rawVideosTable
    ? parsePlaylistVideosTable(rawVideosTable, sectionId)
    : [];
  const batchNotes = extractBatchNotes(content);
  const summary = summarizePlaylistVideos(videos);
  const channel = metadata?.channel?.trim() ?? null;

  return {
    playlistTitle: normalizeAccidentalAllCapsTitle(playlistTitle),
    channel,
    dateLabel,
    playlistUrl: extractPlaylistUrl(content, metadata),
    focus: extractPlaylistFocus(content, metadata),
    studyStatus: metadata?.study_status?.trim()
      ? formatStudyStatusLabel(metadata.study_status)
      : null,
    transcriptStatus: extractTranscriptStatus(batchNotes),
    sourcePath: relativePath ?? null,
    summary,
    videos: applyPlaylistVideoDisplayTitles(videos, {
      playlistTitle,
      channel,
    }),
    batchNotes,
    rawVideosTable,
    parseSucceeded: videos.length > 0,
  };
}

export function shouldRenderPlaylistIndexUi(note: LifeLabNote): boolean {
  return (
    isPlaylistIndexNote({
      sectionId: note.sectionId,
      relativePath: note.relativePath,
      subfolderLabel: note.subfolderLabel,
      metadata: note.metadata,
      content: note.content,
    }) && parsePlaylistIndexNote(note).parseSucceeded
  );
}

export function isYoutubeVideoNote(note: Pick<
  LifeLabNoteSummary,
  "relativePath" | "subfolderLabel" | "metadata"
>): boolean {
  if (note.metadata?.type === "playlist-index") {
    return false;
  }

  const relativePath = note.relativePath ?? "";

  return (
    note.subfolderLabel === "videos" ||
    relativePath.startsWith("videos/") ||
    relativePath.includes("/videos/")
  );
}

export function comparePlaylistVideoNotes(
  left: LifeLabNoteSummary,
  right: LifeLabNoteSummary,
): number {
  const dateDelta = noteContentDateValue(left) - noteContentDateValue(right);

  if (dateDelta !== 0) {
    return dateDelta;
  }

  return left.title.localeCompare(right.title);
}

function summaryToNavLink(
  note: LifeLabNoteSummary,
  sectionId: LifeLabSectionId,
  context: PlaylistTitleCleanupContext,
): PlaylistVideoNavLink {
  return {
    href: `/life-lab/${sectionId}/${note.slug}`,
    title: cleanYoutubePlaylistVideoTitle(note.title, context),
    status: "processed",
    episode: note.metadata?.episode != null ? String(note.metadata.episode) : null,
  };
}

function findCollectionIndexForNote(
  records: LifeLabNoteSummary[],
  note: LifeLabNoteSummary,
): LifeLabNoteSummary | null {
  for (const record of records) {
    if (!isPlaylistIndexSummaryRecord(record)) {
      continue;
    }

    const contentNotes = listCollectionContentNotes(record, records);

    if (contentNotes.some((entry) => entry.slug === note.slug)) {
      return record;
    }
  }

  const playlistName = note.metadata?.playlist?.trim().toLowerCase();

  if (!playlistName) {
    return null;
  }

  for (const record of records) {
    if (!isPlaylistIndexSummaryRecord(record)) {
      continue;
    }

    const title = formatCollectionDisplayTitle({
      title: record.title,
      metadata: record.metadata,
    });

    if (title.toLowerCase() === playlistName) {
      return record;
    }
  }

  return null;
}

function listPlaylistMemberNotes(
  records: LifeLabNoteSummary[],
  videoNote: LifeLabNoteSummary,
): LifeLabNoteSummary[] {
  const indexNote = findCollectionIndexForNote(records, videoNote);

  if (indexNote) {
    const contentNotes = listCollectionContentNotes(indexNote, records);

    if (contentNotes.length > 0) {
      return contentNotes;
    }
  }

  const playlistName = videoNote.metadata?.playlist?.trim();

  if (!playlistName) {
    return [];
  }

  const playlistKey = playlistName.toLowerCase();

  return records.filter(
    (record) =>
      isYoutubeVideoNote(record) &&
      record.metadata?.playlist?.trim().toLowerCase() === playlistKey,
  );
}

export function buildPlaylistNavigationFromVideoNotes(
  records: LifeLabNoteSummary[],
  videoNote: LifeLabNoteSummary,
  sectionId: LifeLabSectionId,
): PlaylistVideoNavigation | null {
  const playlistVideos = listPlaylistMemberNotes(records, videoNote).sort(
    comparePlaylistVideoNotes,
  );

  if (playlistVideos.length <= 1) {
    return null;
  }

  const currentIndex = playlistVideos.findIndex(
    (record) => record.slug === videoNote.slug,
  );

  if (currentIndex === -1) {
    return null;
  }

  const playlistName =
    videoNote.metadata?.playlist?.trim() ??
    formatCollectionDisplayTitle({
      title: playlistVideos[0]?.title,
      metadata: playlistVideos[0]?.metadata,
    });
  const playlistIndexRecord =
    findCollectionIndexForNote(records, videoNote) ??
    records.find(
      (record) =>
        isPlaylistIndexSummaryRecord(record) &&
        formatCollectionDisplayTitle({
          title: record.title,
          metadata: record.metadata,
        }).toLowerCase() === playlistName.toLowerCase(),
    );

  const playlistIndexHref = playlistIndexRecord
    ? `/life-lab/${sectionId}/${playlistIndexRecord.slug}`
    : `/life-lab/${sectionId}?playlist=${encodeURIComponent(playlistName)}`;

  const previousVideo =
    currentIndex > 0 ? playlistVideos[currentIndex - 1] : null;
  const nextVideo =
    currentIndex < playlistVideos.length - 1
      ? playlistVideos[currentIndex + 1]
      : null;

  return {
    playlistIndexHref,
    playlistTitle: playlistName,
    previous: previousVideo
      ? summaryToNavLink(previousVideo, sectionId, {
          playlistTitle: playlistName,
          channel: previousVideo.metadata?.channel,
        })
      : null,
    next: nextVideo
      ? summaryToNavLink(nextVideo, sectionId, {
          playlistTitle: playlistName,
          channel: nextVideo.metadata?.channel,
        })
      : null,
    currentEpisode:
      videoNote.metadata?.episode != null
        ? String(videoNote.metadata.episode)
        : null,
  };
}

export function resolveYoutubeVideoPlaylistNavigation(
  records: LifeLabNoteSummary[],
  videoNote: LifeLabNoteSummary,
  sectionId: LifeLabSectionId,
  playlistContents: Map<string, PlaylistIndexDisplay>,
): PlaylistVideoNavigation | null {
  const playlistIndexSlug = findPlaylistIndexSlugForVideo(
    records,
    videoNote,
    playlistContents,
  );

  if (playlistIndexSlug) {
    const display = playlistContents.get(playlistIndexSlug);

    if (display?.parseSucceeded) {
      const indexedNavigation = buildVideoPlaylistNavigation(
        display,
        videoNote.slug,
        playlistIndexSlug,
        sectionId,
      );

      if (indexedNavigation) {
        return indexedNavigation;
      }
    }
  }

  return buildPlaylistNavigationFromVideoNotes(records, videoNote, sectionId);
}

function toNavLink(video: PlaylistVideoRow): PlaylistVideoNavLink {
  return {
    href: video.noteHref,
    title: playlistVideoRowTitle(video),
    status: video.status,
    episode: video.episode,
  };
}

export function buildVideoPlaylistNavigation(
  display: PlaylistIndexDisplay,
  currentSlug: string,
  playlistIndexSlug: string,
  sectionId: LifeLabSectionId,
): PlaylistVideoNavigation | null {
  const visibleVideos = filterVisiblePlaylistVideos({
    videos: display.videos,
  }).visibleVideos;
  const currentIndex = visibleVideos.findIndex(
    (video) => video.noteSlug === currentSlug,
  );

  if (currentIndex === -1) {
    return null;
  }

  const previousVideo =
    currentIndex > 0 ? visibleVideos[currentIndex - 1] : null;
  const nextVideo =
    currentIndex < visibleVideos.length - 1
      ? visibleVideos[currentIndex + 1]
      : null;

  return {
    playlistIndexHref: `/life-lab/${sectionId}/${playlistIndexSlug}`,
    playlistTitle: display.playlistTitle,
    previous: previousVideo ? toNavLink(previousVideo) : null,
    next: nextVideo ? toNavLink(nextVideo) : null,
    currentEpisode: visibleVideos[currentIndex]?.episode ?? null,
  };
}

export function findPlaylistIndexSlugForVideo(
  records: LifeLabNoteSummary[],
  videoNote: LifeLabNoteSummary,
  playlistContents: Map<string, PlaylistIndexDisplay>,
): string | null {
  const playlistName = videoNote.metadata?.playlist?.trim().toLowerCase();

  if (playlistName) {
    for (const record of records) {
      if (
        !isPlaylistIndexSummaryRecord(record)
      ) {
        continue;
      }

      const recordPlaylist = record.metadata?.playlist?.trim().toLowerCase();

      if (recordPlaylist === playlistName) {
        return record.slug;
      }

      const display = playlistContents.get(record.slug);

      if (
        display?.playlistTitle.trim().toLowerCase() === playlistName
      ) {
        return record.slug;
      }
    }
  }

  for (const [slug, display] of playlistContents.entries()) {
    if (display.videos.some((video) => video.noteSlug === videoNote.slug)) {
      return slug;
    }
  }

  return null;
}
