import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  playlistVideoRowTitle,
  type PlaylistVideoRow,
} from "@/lib/life-lab/playlist-index";
import { resolveNoteYoutubeVideoId } from "@/lib/life-lab/youtube-library";

export type ResolvedRecentVideo = {
  title: string;
  href: string;
};

const RECENT_VIDEOS_HEADING = /^##\s+recent videos?\s*$/im;
const MAX_RECENT_VIDEOS = 6;

function normalizeTitleToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function extractRecentVideosSection(content: string): string | null {
  const match = RECENT_VIDEOS_HEADING.exec(content);

  if (!match || match.index === undefined) {
    return null;
  }

  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextHeading = rest.search(/^##\s+/m);
  const section = (
    nextHeading === -1 ? rest : rest.slice(0, nextHeading)
  ).trim();

  return section || null;
}

export function parseRecentVideoTitles(section: string): string[] {
  const titles: string[] = [];

  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);

    if (!bulletMatch?.[1]) {
      continue;
    }

    const title = bulletMatch[1]
      .replace(/^\[(.+?)\]\([^)]+\)$/, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .trim();

    if (title) {
      titles.push(title);
    }
  }

  return titles;
}

export function extractRecentVideoTitlesFromMarkdown(
  content: string,
): string[] {
  const section = extractRecentVideosSection(content);

  if (!section) {
    return [];
  }

  return parseRecentVideoTitles(section);
}

function resolveByYoutubeId(
  title: string,
  videos: PlaylistVideoRow[],
  notes: LifeLabNoteSummary[],
  sectionId: LifeLabSectionId,
): string | null {
  for (const note of notes) {
    const videoId = resolveNoteYoutubeVideoId(note);

    if (!videoId) {
      continue;
    }

    if (title.includes(videoId)) {
      return `/life-lab/${sectionId}/${note.slug}`;
    }
  }

  for (const video of videos) {
    if (video.videoUrl && title.includes(video.videoUrl)) {
      return video.noteHref;
    }
  }

  return null;
}

function resolveByFileId(
  title: string,
  notes: LifeLabNoteSummary[],
  sectionId: LifeLabSectionId,
): string | null {
  const matches = notes.filter((note) => {
    const fileId = note.fileId?.trim();

    return Boolean(fileId && title.includes(fileId));
  });

  if (matches.length === 1) {
    return `/life-lab/${sectionId}/${matches[0]!.slug}`;
  }

  return null;
}

function resolveByTitle(
  title: string,
  videos: PlaylistVideoRow[],
  notes: LifeLabNoteSummary[],
  sectionId: LifeLabSectionId,
): string | null {
  const normalized = normalizeTitleToken(title);

  const videoMatches = videos.filter(
    (video) => normalizeTitleToken(playlistVideoRowTitle(video)) === normalized,
  );

  if (videoMatches.length === 1 && videoMatches[0]?.noteHref) {
    return videoMatches[0].noteHref;
  }

  const noteMatches = notes.filter(
    (note) => normalizeTitleToken(note.title) === normalized,
  );

  if (noteMatches.length === 1) {
    return `/life-lab/${sectionId}/${noteMatches[0]!.slug}`;
  }

  return null;
}

export function resolveRecentVideoHref(
  title: string,
  input: {
    sectionId: LifeLabSectionId;
    videos: PlaylistVideoRow[];
    notes: LifeLabNoteSummary[];
  },
): string | null {
  return (
    resolveByFileId(title, input.notes, input.sectionId) ??
    resolveByYoutubeId(title, input.videos, input.notes, input.sectionId) ??
    resolveByTitle(title, input.videos, input.notes, input.sectionId)
  );
}

export function resolveRecentVideos(input: {
  titles: string[];
  sectionId: LifeLabSectionId;
  videos: PlaylistVideoRow[];
  notes: LifeLabNoteSummary[];
  totalVisibleVideos: number;
}): ResolvedRecentVideo[] {
  const resolved: ResolvedRecentVideo[] = [];
  const seen = new Set<string>();

  for (const title of input.titles.slice(0, MAX_RECENT_VIDEOS)) {
    const href = resolveRecentVideoHref(title, input);

    if (!href || seen.has(href)) {
      continue;
    }

    seen.add(href);
    resolved.push({ title, href });
  }

  if (resolved.length === 0) {
    return [];
  }

  if (resolved.length >= input.totalVisibleVideos) {
    return [];
  }

  return resolved;
}

export function resolveRecentVideosFromMarkdown(input: {
  content: string;
  sectionId: LifeLabSectionId;
  videos: PlaylistVideoRow[];
  notes: LifeLabNoteSummary[];
  totalVisibleVideos: number;
}): ResolvedRecentVideo[] {
  return resolveRecentVideos({
    titles: extractRecentVideoTitlesFromMarkdown(input.content),
    sectionId: input.sectionId,
    videos: input.videos,
    notes: input.notes,
    totalVisibleVideos: input.totalVisibleVideos,
  });
}
