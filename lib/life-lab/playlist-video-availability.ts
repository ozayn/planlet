import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import type { PlaylistVideoRow } from "@/lib/life-lab/playlist-index";

const UNAVAILABLE_TITLE_PATTERN = /^unavailable\s+video$/i;
const UNAVAILABLE_STATUS_PATTERN = /^(?:unavailable|private|deleted|hidden)$/i;

function readUnavailableFlag(metadata?: LifeLabNoteMetadata | null): boolean {
  const record = metadata as Record<string, unknown> | undefined;
  const value = record?.isUnavailable ?? record?.is_unavailable;

  if (value === true) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
}

export function isUnavailablePlaylistVideo(
  video: PlaylistVideoRow,
  note?: LifeLabNoteSummary,
): boolean {
  const title = (video.displayTitle ?? video.title).trim();

  if (UNAVAILABLE_TITLE_PATTERN.test(title)) {
    return true;
  }

  if (UNAVAILABLE_STATUS_PATTERN.test(video.status)) {
    return true;
  }

  if (readUnavailableFlag(note?.metadata)) {
    return true;
  }

  if (!video.noteSlug && !video.noteFilename && !video.videoUrl) {
    return true;
  }

  return false;
}

export function filterVisiblePlaylistVideos(input: {
  videos: PlaylistVideoRow[];
  notes?: LifeLabNoteSummary[];
}): {
  visibleVideos: PlaylistVideoRow[];
  hiddenUnavailableCount: number;
} {
  const notesBySlug = new Map(
    (input.notes ?? []).map((note) => [note.slug, note]),
  );
  const visibleVideos: PlaylistVideoRow[] = [];
  let hiddenUnavailableCount = 0;

  for (const video of input.videos) {
    const note = video.noteSlug ? notesBySlug.get(video.noteSlug) : undefined;

    if (isUnavailablePlaylistVideo(video, note)) {
      hiddenUnavailableCount += 1;
      continue;
    }

    visibleVideos.push(video);
  }

  return {
    visibleVideos,
    hiddenUnavailableCount,
  };
}
