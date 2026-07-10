import type {
  LifeLabNote,
  LifeLabNoteMetadata,
  LifeLabNoteSummary,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import { noteContentDateValue } from "@/lib/life-lab/browse";
import {
  driveRelativePathToSlug,
  markdownExcerpt,
  relativePathFilename,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";

export type PlaylistVideoStatus = "processed" | "pending" | "skipped" | "error";

export type PlaylistVideoRow = {
  episode: string | null;
  title: string;
  status: PlaylistVideoStatus;
  duration: string | null;
  videoUrl: string | null;
  noteFilename: string | null;
  noteSlug: string | null;
  noteHref: string | null;
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
    return markdownExcerpt(metadata.summary, 220);
  }

  const summarySection = extractSectionByHeading(
    body,
    PLAYLIST_SUMMARY_HEADING_PATTERN,
  );

  if (summarySection) {
    return markdownExcerpt(summarySection, 220);
  }

  const labeledMatch = body.match(
    /^\*\*Playlist summary\*\*\s*\n+([\s\S]*?)(?=\n##\s+|\n\*\*[A-Za-z ]+\*\*|\n---\s*$|$)/im,
  );

  if (labeledMatch?.[1]?.trim()) {
    return markdownExcerpt(labeledMatch[1].trim(), 220);
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

  return firstParagraph ? markdownExcerpt(firstParagraph, 220) : null;
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

export function isPlaylistIndexSummaryRecord(
  record: Pick<
    LifeLabNoteSummary,
    "relativePath" | "subfolderLabel" | "metadata"
  >,
): boolean {
  if (record.metadata?.type === "playlist-index") {
    return true;
  }

  const relativePath = record.relativePath ?? "";

  return (
    record.subfolderLabel === "playlists" ||
    relativePath.startsWith("playlists/") ||
    relativePath.includes("/playlists/")
  );
}

export function isPlaylistIndexNote(input: {
  sectionId?: LifeLabSectionId;
  relativePath?: string;
  subfolderLabel?: string | null;
  metadata?: LifeLabNoteMetadata;
  content?: string;
}): boolean {
  if (input.metadata?.type === "playlist-index") {
    return true;
  }

  if (input.sectionId === "youtube-learning") {
    const relativePath = input.relativePath ?? "";

    if (
      input.subfolderLabel === "playlists" ||
      relativePath.startsWith("playlists/") ||
      relativePath.includes("/playlists/")
    ) {
      return true;
    }

    if (
      input.metadata?.source === "youtube" &&
      input.metadata.playlist?.trim()
    ) {
      return true;
    }
  }

  if (input.content && hasPlaylistVideosTable(input.content)) {
    return true;
  }

  if (input.content && hasPlaylistSummaryAndVideoList(input.content)) {
    return true;
  }

  return false;
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

  return {
    playlistTitle,
    channel: metadata?.channel?.trim() ?? null,
    dateLabel,
    playlistUrl: extractPlaylistUrl(content, metadata),
    focus: extractPlaylistFocus(content, metadata),
    studyStatus: metadata?.study_status?.trim()
      ? formatStudyStatusLabel(metadata.study_status)
      : null,
    transcriptStatus: extractTranscriptStatus(batchNotes),
    sourcePath: relativePath ?? null,
    summary,
    videos,
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
): PlaylistVideoNavLink {
  return {
    href: `/life-lab/${sectionId}/${note.slug}`,
    title: note.title,
    status: "processed",
    episode: note.metadata?.episode != null ? String(note.metadata.episode) : null,
  };
}

export function buildPlaylistNavigationFromVideoNotes(
  records: LifeLabNoteSummary[],
  videoNote: LifeLabNoteSummary,
  sectionId: LifeLabSectionId,
): PlaylistVideoNavigation | null {
  const playlistName = videoNote.metadata?.playlist?.trim();

  if (!playlistName) {
    return null;
  }

  const playlistKey = playlistName.toLowerCase();
  const playlistVideos = records
    .filter(
      (record) =>
        isYoutubeVideoNote(record) &&
        record.metadata?.playlist?.trim().toLowerCase() === playlistKey,
    )
    .sort(comparePlaylistVideoNotes);

  if (playlistVideos.length <= 1) {
    return null;
  }

  const currentIndex = playlistVideos.findIndex(
    (record) => record.slug === videoNote.slug,
  );

  if (currentIndex === -1) {
    return null;
  }

  const playlistIndexRecord = records.find(
    (record) =>
      isPlaylistIndexSummaryRecord(record) &&
      record.metadata?.playlist?.trim().toLowerCase() === playlistKey,
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
    previous: previousVideo ? summaryToNavLink(previousVideo, sectionId) : null,
    next: nextVideo ? summaryToNavLink(nextVideo, sectionId) : null,
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
    title: video.title,
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
  const currentIndex = display.videos.findIndex(
    (video) => video.noteSlug === currentSlug,
  );

  if (currentIndex === -1) {
    return null;
  }

  const previousVideo =
    currentIndex > 0 ? display.videos[currentIndex - 1] : null;
  const nextVideo =
    currentIndex < display.videos.length - 1
      ? display.videos[currentIndex + 1]
      : null;

  return {
    playlistIndexHref: `/life-lab/${sectionId}/${playlistIndexSlug}`,
    playlistTitle: display.playlistTitle,
    previous: previousVideo ? toNavLink(previousVideo) : null,
    next: nextVideo ? toNavLink(nextVideo) : null,
    currentEpisode: display.videos[currentIndex]?.episode ?? null,
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
