import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { isYoutubeVideoNote } from "@/lib/life-lab/playlist-index";
import { relativePathFilename } from "@/lib/life-lab/slug";

export const NON_PLAYABLE_NOTE_FILENAMES = new Set([
  "readme.md",
  "playlist-summary.md",
  "channels.md",
  "concepts.md",
  "questions.md",
  "interests.md",
  "sources.md",
]);

export const INTERNAL_PLAYLIST_TITLES = new Set([
  "youtube playlist processing",
  "processing",
  "import",
  "pipeline",
  "temp",
  "debug",
  "internal",
]);

export function isNonPlayableMetadataNote(note: LifeLabNoteSummary): boolean {
  const filename = relativePathFilename(note.relativePath).toLowerCase();

  return NON_PLAYABLE_NOTE_FILENAMES.has(filename);
}

export function isPlayableYoutubeNote(note: LifeLabNoteSummary): boolean {
  if (!isYoutubeVideoNote(note)) {
    return false;
  }

  return !isNonPlayableMetadataNote(note);
}

export function isInternalPlaylistTitle(title: string): boolean {
  return INTERNAL_PLAYLIST_TITLES.has(title.trim().toLowerCase());
}

export function playlistTitleKey(title: string): string {
  return title.trim().toLowerCase();
}
