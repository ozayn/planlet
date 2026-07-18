import type {
  LifeLabNote,
  LifeLabNoteMetadata,
  LifeLabNoteSummary,
} from "@/lib/life-lab/constants";
import { resolveLifeLabNoteImage } from "@/lib/life-lab/note-image";
import {
  driveRelativePathToSlug,
  markdownExcerpt,
  relativePathFilename,
} from "@/lib/life-lab/slug";
import { normalizeSourceUrl } from "@/lib/life-lab/source-url";

export type PodcastEpisodeStatus = "processed" | "pending" | "error";

export type PodcastIndexEpisode = {
  date: string | null;
  title: string;
  duration: string | null;
  status: PodcastEpisodeStatus;
  noteRelativePath: string | null;
  noteSlug: string | null;
  noteHref: string | null;
  noteExists: boolean;
};

export type PodcastShow = {
  slug: string;
  indexSlug: string;
  relativePath: string;
  title: string;
  description: string | null;
  artwork: ReturnType<typeof resolveLifeLabNoteImage>;
  episodes: PodcastIndexEpisode[];
  totalCount: number;
  processedCount: number;
  pendingCount: number;
  errorCount: number;
  lastUpdated: string | null;
};

const PODCAST_BLOCKED_FOLDER_NAMES = new Set([
  "private",
  "working",
  "work",
  "raw",
  "raw-audio",
  "audio",
  "transcripts",
  "transcript",
  "chunks",
  "chunk-notes",
  "drafts",
  "synthesis-drafts",
  "status",
  "logs",
]);

const PODCAST_BLOCKED_FILE_PATTERNS = [
  /(?:^|[-_.])transcript(?:[-_.]|$)/i,
  /(?:^|[-_.])chunk(?:[-_.]|$)/i,
  /(?:^|[-_.])draft(?:[-_.]|$)/i,
  /(?:^|[-_.])synthesis(?:[-_.]|$)/i,
  /(?:^|[-_.])status(?:[-_.]|$)/i,
  /(?:^|[-_.])log(?:[-_.]|$)/i,
];

function pathSegments(relativePath: string): string[] {
  return relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
}

function posixDirname(relativePath: string): string {
  const parts = pathSegments(relativePath);
  return parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
}

function posixBasename(relativePath: string): string {
  return pathSegments(relativePath).at(-1) ?? relativePath;
}

function normalizePosixPath(value: string): string {
  const normalized: string[] = [];

  for (const segment of value.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (normalized.length === 0 || normalized.at(-1) === "..") {
        normalized.push("..");
      } else {
        normalized.pop();
      }
      continue;
    }

    normalized.push(segment);
  }

  return normalized.join("/");
}

export function isPodcastBlockedFolder(
  folderName: string,
  prefix = "",
): boolean {
  const segments = pathSegments(prefix ? `${prefix}/${folderName}` : folderName);

  return segments.some((segment) =>
    PODCAST_BLOCKED_FOLDER_NAMES.has(segment.trim().toLowerCase()),
  );
}

export function isPodcastVisibleMarkdown(relativePath: string): boolean {
  const segments = pathSegments(relativePath);
  const filename = segments.at(-1) ?? "";

  if (
    segments.some((segment) =>
      PODCAST_BLOCKED_FOLDER_NAMES.has(segment.trim().toLowerCase()),
    )
  ) {
    return false;
  }

  return !PODCAST_BLOCKED_FILE_PATTERNS.some((pattern) =>
    pattern.test(filename),
  );
}

export function isPodcastShowIndex(
  note: Pick<LifeLabNoteSummary, "relativePath" | "metadata">,
): boolean {
  const filename = relativePathFilename(note.relativePath).toLowerCase();
  const type = note.metadata?.type?.trim().toLowerCase();

  return (
    filename === "index.md" &&
    (type === undefined ||
      type === "podcast" ||
      type === "podcast-series" ||
      type === "podcast-show" ||
      type === "podcast-show-index")
  );
}

export function isPodcastEpisodeNote(
  note: Pick<LifeLabNoteSummary, "relativePath" | "metadata">,
): boolean {
  const segments = pathSegments(note.relativePath).map((part) =>
    part.toLowerCase(),
  );
  const type = note.metadata?.type?.trim().toLowerCase();

  return (
    segments.includes("episodes") ||
    type === "podcast-note" ||
    type === "podcast-episode" ||
    type === "podcast-episode-note"
  );
}

export function findPodcastShowIndex(
  episode: Pick<LifeLabNoteSummary, "relativePath">,
  notes: LifeLabNoteSummary[],
): LifeLabNoteSummary | null {
  const episodePath = episode.relativePath.toLowerCase();

  return (
    notes
      .filter(isPodcastShowIndex)
      .filter((indexNote) => {
        const folder = posixDirname(indexNote.relativePath).toLowerCase();
        return episodePath.startsWith(`${folder}/`);
      })
      .sort(
        (left, right) =>
          posixDirname(right.relativePath).length -
          posixDirname(left.relativePath).length,
      )[0] ?? null
  );
}

function extractHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match?.[1]?.trim() || null;
}

function extractEpisodesSection(content: string): string {
  const match = content.match(/^##\s+Episodes\s*$/im);

  if (!match || match.index === undefined) {
    return "";
  }

  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function extractMarkdownSection(content: string, heading: string): string | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(
    new RegExp(`^##\\s+${escapedHeading}\\s*$`, "im"),
  );

  if (!match || match.index === undefined) {
    return null;
  }

  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim() || null;
}

function extractDescription(
  content: string,
  metadata: LifeLabNoteMetadata,
): string | null {
  if (metadata.summary?.trim()) {
    return metadata.summary.trim();
  }

  const showSummary = extractMarkdownSection(content, "Show summary");

  if (showSummary) {
    return markdownExcerpt(showSummary, 180);
  }

  const episodes = content.search(/^##\s+Episodes\s*$/im);
  const preamble = (episodes === -1 ? content : content.slice(0, episodes))
    .replace(/^#\s+.+$/m, "")
    .trim();

  return preamble ? markdownExcerpt(preamble, 180) : null;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of trimmed) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      current += character;
      continue;
    }

    if (character === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function plainMarkdownLabel(value: string): string {
  return value
    .replace(/!\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function markdownLinkTarget(value: string): string | null {
  const match = value.match(/\[[^\]]+]\(([^)]+)\)/);
  return match?.[1]?.trim().replace(/^<|>$/g, "") || null;
}

function normalizeEpisodeStatus(value: string): PodcastEpisodeStatus {
  const normalized = plainMarkdownLabel(value).toLowerCase();

  if (normalized.includes("error") || normalized.includes("failed")) {
    return "error";
  }

  if (
    normalized.includes("processed") ||
    normalized.includes("complete") ||
    normalized.includes("ready")
  ) {
    return "processed";
  }

  return "pending";
}

export function resolvePodcastNoteRelativePath(
  indexRelativePath: string,
  target: string,
): string | null {
  const clean = target.trim().split(/[?#]/, 1)[0]?.trim();

  if (
    !clean ||
    clean.startsWith("/") ||
    clean.startsWith("\\") ||
    /^[a-z][a-z0-9+.-]*:/i.test(clean)
  ) {
    return null;
  }

  const directory = posixDirname(indexRelativePath);
  const normalized = normalizePosixPath(
    directory === "." ? clean : `${directory}/${clean}`,
  );

  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    !normalized.toLowerCase().endsWith(".md")
  ) {
    return null;
  }

  return normalized;
}

export function buildPodcastTimelinePreview(content: string): {
  preview: string;
  itemCount: number;
} {
  const lines = content.split("\n");
  const tableLines = lines.filter((line) => line.trim().startsWith("|"));

  if (
    tableLines.length >= 2 &&
    /^\|?\s*:?-{3,}/.test(tableLines[1]?.trim() ?? "")
  ) {
    return {
      preview: tableLines.slice(0, 5).join("\n"),
      itemCount: Math.max(0, tableLines.length - 2),
    };
  }

  const itemIndexes = lines
    .map((line, index) => (/^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const fourthItem = itemIndexes[3];

  return {
    preview:
      itemIndexes.length > 0
        ? lines.slice(0, fourthItem ?? lines.length).join("\n").trim()
        : content,
    itemCount: itemIndexes.length,
  };
}

function parseEpisodeTable(
  content: string,
  indexRelativePath: string,
  notePaths: Set<string>,
): PodcastIndexEpisode[] {
  const section = extractEpisodesSection(content);
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 2) {
    return [];
  }

  const headers = splitTableRow(lines[0]!).map((header) =>
    plainMarkdownLabel(header).toLowerCase(),
  );
  const separator = splitTableRow(lines[1]!);

  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) {
    return [];
  }

  const column = (names: string[]): number =>
    headers.findIndex((header) => names.includes(header));
  const dateIndex = column(["date", "publication date", "published"]);
  const statusIndex = column(["status", "state"]);
  const titleIndex = column(["episode", "episode title", "title"]);
  const durationIndex = column(["duration", "length"]);
  const noteIndex = column(["note", "notes"]);

  if (titleIndex === -1) {
    return [];
  }

  const episodes = lines.slice(2).flatMap((line) => {
    const cells = splitTableRow(line);
    const title = plainMarkdownLabel(cells[titleIndex] ?? "");

    if (!title) {
      return [];
    }

    const indexedStatus = normalizeEpisodeStatus(cells[statusIndex] ?? "");
    const target = markdownLinkTarget(cells[noteIndex] ?? "");
    const noteRelativePath = target
      ? resolvePodcastNoteRelativePath(indexRelativePath, target)
      : null;
    const noteExists = noteRelativePath
      ? notePaths.has(noteRelativePath.toLowerCase())
      : false;
    const status =
      indexedStatus === "processed" && !noteExists ? "error" : indexedStatus;
    const noteSlug =
      status === "processed" && noteExists && noteRelativePath
        ? driveRelativePathToSlug(noteRelativePath)
        : null;

    return [
      {
        date: plainMarkdownLabel(cells[dateIndex] ?? "") || null,
        title,
        duration: plainMarkdownLabel(cells[durationIndex] ?? "") || null,
        status,
        noteRelativePath,
        noteSlug,
        noteHref: noteSlug ? `/life-lab/podcasts/${noteSlug}` : null,
        noteExists,
      },
    ];
  });

  return episodes.sort((left, right) =>
    (right.date ?? "").localeCompare(left.date ?? ""),
  );
}

function showSlugFromIndexPath(relativePath: string): string {
  const parent = posixDirname(relativePath);
  return parent === "." ? "podcasts" : driveRelativePathToSlug(`${parent}.md`);
}

function lastUpdatedFromEpisodes(
  episodes: PodcastIndexEpisode[],
  fallback: string | null,
): string | null {
  const latest = episodes
    .map((episode) => episode.date)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0];

  return latest ?? fallback;
}

export function parsePodcastShowIndex(input: {
  note: Pick<
    LifeLabNote,
    | "slug"
    | "title"
    | "relativePath"
    | "metadata"
    | "modifiedAt"
  > & {
    content?: string;
    podcastIndexContent?: string;
  };
  relatedNotes: LifeLabNoteSummary[];
}): PodcastShow {
  const { note, relatedNotes } = input;
  const content = note.content ?? note.podcastIndexContent ?? "";
  const notePaths = new Set(
    relatedNotes.map((item) => item.relativePath.toLowerCase()),
  );
  const episodes = parseEpisodeTable(
    content,
    note.relativePath,
    notePaths,
  );
  const title =
    note.metadata?.show?.trim() ||
    extractHeading(content) ||
    posixBasename(posixDirname(note.relativePath)).replace(/-/g, " ");
  const processedCount = episodes.filter(
    (episode) => episode.status === "processed",
  ).length;
  const pendingCount = episodes.filter(
    (episode) => episode.status === "pending",
  ).length;
  const errorCount = episodes.filter(
    (episode) => episode.status === "error",
  ).length;
  const newestEpisodeArtwork = episodes
    .map((episode) =>
      episode.noteRelativePath
        ? relatedNotes.find(
            (item) =>
              item.relativePath.toLowerCase() ===
              episode.noteRelativePath?.toLowerCase(),
          )
        : null,
    )
    .map((episodeNote) => resolveLifeLabNoteImage(episodeNote?.metadata))
    .find((image) => image !== null);

  return {
    slug: showSlugFromIndexPath(note.relativePath),
    indexSlug: note.slug,
    relativePath: note.relativePath,
    title,
    description: extractDescription(content, note.metadata ?? {}),
    artwork: resolveLifeLabNoteImage(note.metadata) ?? newestEpisodeArtwork ?? null,
    episodes,
    totalCount: episodes.length,
    processedCount,
    pendingCount,
    errorCount,
    lastUpdated: lastUpdatedFromEpisodes(episodes, note.modifiedAt),
  };
}

export function podcastEpisodeSourceUrl(
  metadata: LifeLabNoteMetadata | undefined,
): string | null {
  return normalizeSourceUrl(
    metadata?.episode_url ?? metadata?.source_url ?? metadata?.sourceUrl ?? "",
  );
}

export function podcastEpisodeDisplayTitle(
  note: Pick<LifeLabNote, "title" | "metadata">,
): string {
  return note.metadata?.episode_title?.trim() || note.title;
}
