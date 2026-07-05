import type {
  LifeLabNote,
  LifeLabNoteMetadata,
  LifeLabSectionId,
} from "@/lib/life-lab/constants";
import {
  driveRelativePathToSlug,
  titleFromMarkdownHeading,
} from "@/lib/life-lab/slug";

export type PlaylistVideoStatus = "processed" | "pending" | "skipped" | "error";

export type PlaylistVideoRow = {
  episode: string | null;
  title: string;
  status: PlaylistVideoStatus;
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
  summary: PlaylistIndexSummary;
  videos: PlaylistVideoRow[];
  batchNotes: string[];
  rawVideosTable: string | null;
  parseSucceeded: boolean;
};

const PLAYLIST_VIDEO_STATUSES = new Set<PlaylistVideoStatus>([
  "processed",
  "pending",
  "skipped",
  "error",
]);

const VIDEOS_HEADING_PATTERN = /^##\s+videos\s*$/im;

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

function parsePlaylistVideosTable(tableMarkdown: string): PlaylistVideoRow[] {
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
      videoUrl: cleanCellValue(cells[urlIndex]),
      noteFilename,
      noteSlug,
      noteHref:
        status === "processed" && noteSlug
          ? `/life-lab/youtube-learning/${noteSlug}`
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
  }

  if (input.content && hasPlaylistVideosTable(input.content)) {
    return true;
  }

  return false;
}

export function parsePlaylistIndexNote(note: LifeLabNote): PlaylistIndexDisplay {
  const { metadata, content, title, dateLabel } = note;
  const playlistTitle =
    metadata?.playlist?.trim() ??
    titleFromMarkdownHeading(content) ??
    title;
  const videosSection = extractSectionByHeading(content, VIDEOS_HEADING_PATTERN);
  const rawVideosTable = videosSection
    ? extractFirstMarkdownTable(videosSection)
    : null;
  const videos = rawVideosTable
    ? parsePlaylistVideosTable(rawVideosTable)
    : [];
  const summary = summarizePlaylistVideos(videos);

  return {
    playlistTitle,
    channel: metadata?.channel?.trim() ?? null,
    dateLabel,
    playlistUrl: extractPlaylistUrl(content, metadata),
    summary,
    videos,
    batchNotes: extractBatchNotes(content),
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
