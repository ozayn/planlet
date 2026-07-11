import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { isPlaylistIndexNote } from "@/lib/life-lab/playlist-index";
import { isReadmeSlug, relativePathFilename } from "@/lib/life-lab/slug";
import {
  isInternalPlaylistTitle,
  isNonPlayableMetadataNote,
  isPlayableYoutubeNote,
} from "@/lib/life-lab/youtube-browse";

export type YoutubeLibraryNoteRole =
  | "playlist-video"
  | "standalone-video"
  | "reference"
  | "archive"
  | "about";

export function hasRecognizedPlaylist(note: LifeLabNoteSummary): boolean {
  const playlist = note.metadata?.playlist?.trim();

  if (!playlist) {
    return false;
  }

  return !isInternalPlaylistTitle(playlist);
}

export function classifyYoutubeLibraryNote(
  note: LifeLabNoteSummary,
): YoutubeLibraryNoteRole | null {
  if (isReadmeSlug(note.slug)) {
    return "about";
  }

  const filename = relativePathFilename(note.relativePath).toLowerCase();

  if (filename === "playlist-summary.md") {
    return "about";
  }

  if (note.subfolderLabel?.toLowerCase() === "archive") {
    return "archive";
  }

  if (
    isPlaylistIndexNote({
      sectionId: "youtube-learning",
      relativePath: note.relativePath,
      subfolderLabel: note.subfolderLabel,
      metadata: note.metadata,
    })
  ) {
    return null;
  }

  if (isNonPlayableMetadataNote(note)) {
    return "reference";
  }

  if (!note.subfolderLabel && !note.metadata?.playlist?.trim()) {
    return "reference";
  }

  if (!isPlayableYoutubeNote(note)) {
    return null;
  }

  if (hasRecognizedPlaylist(note)) {
    return "playlist-video";
  }

  return "standalone-video";
}

export function isStandaloneYoutubeVideo(note: LifeLabNoteSummary): boolean {
  return classifyYoutubeLibraryNote(note) === "standalone-video";
}

export function isPlaylistYoutubeVideo(note: LifeLabNoteSummary): boolean {
  return classifyYoutubeLibraryNote(note) === "playlist-video";
}

export function noteLibraryDedupeKey(note: LifeLabNoteSummary): string {
  const fileId = note.fileId?.trim();

  if (fileId) {
    return fileId;
  }

  if (note.relativePath) {
    return note.relativePath;
  }

  return note.slug;
}
