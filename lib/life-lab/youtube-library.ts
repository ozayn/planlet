import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { isPlaylistIndexNote } from "@/lib/life-lab/playlist-index";
import { isReadmeSlug, relativePathFilename } from "@/lib/life-lab/slug";
import {
  isInternalPlaylistTitle,
  isNonPlayableMetadataNote,
  isPlayableYoutubeNote,
} from "@/lib/life-lab/youtube-browse";
import {
  buildPlaylistOwnershipRegistry,
  classifyVideoOwnership,
  isPlaylistVideoOwnership,
  isStandaloneVideoOwnership,
  resolveNoteYoutubeVideoId,
  type PlaylistOwnershipRegistry,
  type VideoOwnership,
} from "@/lib/life-lab/video-ownership";

export type YoutubeLibraryNoteRole =
  | "playlist-video"
  | "standalone-video"
  | "unresolved-playlist-video"
  | "reference"
  | "archive"
  | "about";

export type YoutubeLibraryClassifier = {
  registry: PlaylistOwnershipRegistry;
  classifyOwnership: (note: LifeLabNoteSummary) => VideoOwnership | null;
  classifyRole: (note: LifeLabNoteSummary) => YoutubeLibraryNoteRole | null;
};

export function createYoutubeLibraryClassifier(
  notes: LifeLabNoteSummary[],
): YoutubeLibraryClassifier {
  const registry = buildPlaylistOwnershipRegistry(notes);

  function classifyOwnership(note: LifeLabNoteSummary): VideoOwnership | null {
    return classifyVideoOwnership(note, registry);
  }

  function classifyRole(note: LifeLabNoteSummary): YoutubeLibraryNoteRole | null {
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

    const ownership = classifyOwnership(note);

    if (ownership?.kind === "playlist") {
      return "playlist-video";
    }

    if (ownership?.kind === "unresolved") {
      return "unresolved-playlist-video";
    }

    if (ownership?.kind === "standalone") {
      return "standalone-video";
    }

    return null;
  }

  return {
    registry,
    classifyOwnership,
    classifyRole,
  };
}

let defaultClassifier: YoutubeLibraryClassifier | null = null;

function getClassifier(notes?: LifeLabNoteSummary[]): YoutubeLibraryClassifier {
  if (notes && notes.length > 0) {
    return createYoutubeLibraryClassifier(notes);
  }

  if (!defaultClassifier) {
    defaultClassifier = createYoutubeLibraryClassifier([]);
  }

  return defaultClassifier;
}

export function classifyVideoOwnershipForNote(
  note: LifeLabNoteSummary,
  notes?: LifeLabNoteSummary[],
): VideoOwnership | null {
  return getClassifier(notes).classifyOwnership(note);
}

/** @deprecated Use classifyVideoOwnershipForNote or createYoutubeLibraryClassifier */
export function hasRecognizedPlaylist(note: LifeLabNoteSummary): boolean {
  const ownership = classifyVideoOwnershipForNote(note);

  return isPlaylistVideoOwnership(ownership);
}

export function classifyYoutubeLibraryNote(
  note: LifeLabNoteSummary,
  notes?: LifeLabNoteSummary[],
): YoutubeLibraryNoteRole | null {
  return getClassifier(notes).classifyRole(note);
}

export function isStandaloneYoutubeVideo(
  note: LifeLabNoteSummary,
  notes?: LifeLabNoteSummary[],
): boolean {
  return classifyYoutubeLibraryNote(note, notes) === "standalone-video";
}

export function isPlaylistYoutubeVideo(
  note: LifeLabNoteSummary,
  notes?: LifeLabNoteSummary[],
): boolean {
  return classifyYoutubeLibraryNote(note, notes) === "playlist-video";
}

export function noteLibraryDedupeKey(note: LifeLabNoteSummary): string {
  const fileId = note.fileId?.trim();

  if (fileId) {
    return fileId;
  }

  const videoId = resolveNoteYoutubeVideoId(note);

  if (videoId) {
    return `yt:${videoId}`;
  }

  if (note.relativePath) {
    return note.relativePath;
  }

  return note.slug;
}

export {
  buildPlaylistOwnershipRegistry,
  classifyVideoOwnership,
  resolveNoteYoutubeVideoId,
  resolvePlaylistContextLabel,
  type VideoOwnership,
} from "@/lib/life-lab/video-ownership";
