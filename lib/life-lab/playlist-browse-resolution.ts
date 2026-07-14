import type { LifeLabNoteSummary, LifeLabSectionId } from "@/lib/life-lab/constants";
import {
  formatCollectionDisplayTitle,
  resolveCollection,
  type CollectionResolution,
} from "@/lib/life-lab/collection";
import { classifyLifeLabFile } from "@/lib/life-lab/file-classification";
import { isPlaylistIndexNote } from "@/lib/life-lab/playlist-index";
import { resolvePlaylistAssetsFolder } from "@/lib/life-lab/playlist-asset-resolution";
import { isInternalPlaylistTitle } from "@/lib/life-lab/youtube-browse";
import type { LifeLabSectionNoteRecord } from "@/lib/life-lab/enrichment";
import { shouldLogLifeLab } from "@/lib/life-lab/log-level";

export type PlaylistBrowseResolutionState =
  | "resolved"
  | "partiallyResolved"
  | "invalid";

export type PlaylistBrowseResolution = {
  state: PlaylistBrowseResolutionState;
  title: string;
  noteCount: number | null;
  collection: CollectionResolution | null;
  hiddenReason: string | null;
};

export type PlaylistBrowseDiagnosticEntry = {
  indexFileId: string;
  relativePath: string;
  title: string;
  playlistId: string | null;
  assetPath: string | null;
  resolvedFolderPath: string | null;
  resolutionSource: string | null;
  noteCount: number | null;
  state: PlaylistBrowseResolutionState;
  hiddenReason: string | null;
};

export function parsePlaylistIndexNoteCountFromExcerpt(
  excerpt: string,
): number | null {
  const trimmed = excerpt.trim();

  if (!trimmed) {
    return null;
  }

  const processedMatch = trimmed.match(/(\d+)\s+processed/i);

  if (processedMatch) {
    const count = Number.parseInt(processedMatch[1] ?? "", 10);

    return Number.isFinite(count) ? count : null;
  }

  const notesMatch = trimmed.match(/(\d+)\s+notes?/i);

  if (notesMatch) {
    const count = Number.parseInt(notesMatch[1] ?? "", 10);

    return Number.isFinite(count) ? count : null;
  }

  return null;
}

export function isValidPlaylistBrowseIndex(
  sectionId: LifeLabSectionId,
  note: LifeLabNoteSummary,
): boolean {
  if (
    classifyLifeLabFile({
      sectionId,
      relativePath: note.relativePath,
      subfolderLabel: note.subfolderLabel,
      metadata: note.metadata,
      title: note.title,
    }) === "playlistArtifact"
  ) {
    return false;
  }

  if (
    !isPlaylistIndexNote({
      sectionId,
      relativePath: note.relativePath,
      subfolderLabel: note.subfolderLabel,
      metadata: note.metadata,
    })
  ) {
    return false;
  }

  const title = formatCollectionDisplayTitle({
    title: note.title,
    metadata: note.metadata,
  });

  return !isInternalPlaylistTitle(title);
}

export function resolvePlaylistBrowseState(input: {
  sectionId: LifeLabSectionId;
  indexNote: LifeLabNoteSummary;
  allNotes: LifeLabNoteSummary[];
}): PlaylistBrowseResolution {
  const { sectionId, indexNote, allNotes } = input;

  if (
    classifyLifeLabFile({
      sectionId,
      relativePath: indexNote.relativePath,
      subfolderLabel: indexNote.subfolderLabel,
      metadata: indexNote.metadata,
      title: indexNote.title,
    }) === "playlistArtifact"
  ) {
    return {
      state: "invalid",
      title: indexNote.title,
      noteCount: null,
      collection: null,
      hiddenReason: "playlist-artifact",
    };
  }

  if (
    !isPlaylistIndexNote({
      sectionId,
      relativePath: indexNote.relativePath,
      subfolderLabel: indexNote.subfolderLabel,
      metadata: indexNote.metadata,
    })
  ) {
    return {
      state: "invalid",
      title: indexNote.title,
      noteCount: null,
      collection: null,
      hiddenReason: "not-playlist-index",
    };
  }

  const title = formatCollectionDisplayTitle({
    title: indexNote.title,
    metadata: indexNote.metadata,
  });

  if (isInternalPlaylistTitle(title)) {
    return {
      state: "invalid",
      title,
      noteCount: null,
      collection: null,
      hiddenReason: "internal-playlist",
    };
  }

  const collection = resolveCollection(indexNote, allNotes);
  const excerptCount = parsePlaylistIndexNoteCountFromExcerpt(indexNote.excerpt);

  if (collection.resolved && collection.contentNotes.length > 0) {
    return {
      state: "resolved",
      title,
      noteCount: collection.contentNotes.length,
      collection,
      hiddenReason: null,
    };
  }

  return {
    state: "partiallyResolved",
    title,
    noteCount: excerptCount,
    collection,
    hiddenReason: collection.resolved
      ? "resolved-without-notes"
      : "collection-folder-unresolved",
  };
}

export function buildPlaylistBrowseDiagnosticEntry(input: {
  sectionId: LifeLabSectionId;
  indexNote: LifeLabNoteSummary;
  resolution: PlaylistBrowseResolution;
  records?: LifeLabSectionNoteRecord[];
  body?: string;
}): PlaylistBrowseDiagnosticEntry {
  const assetFolder = resolvePlaylistAssetsFolder({
    indexNote: input.indexNote,
    records: input.records,
    body: input.body,
  });
  const playlistId =
    assetFolder.status === "resolved" ? assetFolder.playlistId : null;
  const assetPath =
    assetFolder.status === "resolved" ? assetFolder.relativePath : null;

  return {
    indexFileId: input.indexNote.fileId,
    relativePath: input.indexNote.relativePath,
    title: input.resolution.title,
    playlistId,
    assetPath,
    resolvedFolderPath: input.resolution.collection?.folderPath ?? null,
    resolutionSource: input.resolution.collection?.resolutionSource ?? null,
    noteCount: input.resolution.noteCount,
    state: input.resolution.state,
    hiddenReason: input.resolution.hiddenReason,
  };
}

/**
 * Single canonical playlist identity for browse, detail, assets, and cache keys.
 * Uses the same resolution path as playlist asset loading (metadata → body → records).
 */
export function resolveCanonicalPlaylistId(input: {
  indexNote: LifeLabNoteSummary;
  records?: LifeLabSectionNoteRecord[];
  body?: string;
}): {
  playlistId: string | null;
  assetPath: string | null;
  source: string | null;
} {
  const folder = resolvePlaylistAssetsFolder({
    indexNote: input.indexNote,
    records: input.records,
    body: input.body,
  });

  if (folder.status === "resolved") {
    return {
      playlistId: folder.playlistId,
      assetPath: folder.relativePath,
      source: folder.source,
    };
  }

  return {
    playlistId: null,
    assetPath: null,
    source: null,
  };
}

export function logPlaylistBrowseDiagnostics(input: {
  sectionId: LifeLabSectionId;
  entries: PlaylistBrowseDiagnosticEntry[];
  indexFilesFound: number;
  cardsShown: number;
  driveFolderId?: string | null;
}): void {
  if (!shouldLogLifeLab("verbose")) {
    return;
  }

  const payload = {
    scope: "life-lab:playlist-browse",
    sectionId: input.sectionId,
    indexFilesFound: input.indexFilesFound,
    cardsShown: input.cardsShown,
    driveFolderId: input.driveFolderId ?? null,
    playlists: input.entries,
  };

  console.info(JSON.stringify(payload));
}
