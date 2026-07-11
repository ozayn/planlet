import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  collectionSlugFromIndexNote,
  formatCollectionDisplayTitle,
  isNoteUnderFolderPath,
  normalizeCollectionSlug,
  resolveCollection,
} from "@/lib/life-lab/collection";
import { isValidPlaylistBrowseIndex } from "@/lib/life-lab/playlist-browse-resolution";
import {
  isInternalPlaylistTitle,
  isNonPlayableMetadataNote,
  isPlayableYoutubeNote,
  playlistTitleKey,
} from "@/lib/life-lab/youtube-browse";
import { extractYouTubeVideoId } from "@/lib/life-lab/youtube-video-id";

const PLAYLIST_ID_FIELDS = [
  "playlistId",
  "playlist_id",
  "youtubePlaylistId",
  "youtube_playlist_id",
] as const;

const PLAYLIST_PATH_FIELDS = [
  "playlistPath",
  "playlist_path",
  "collectionPath",
  "collection_path",
  "folderPath",
  "folder_path",
  "videosPath",
  "videos_path",
] as const;

const PLAYLIST_SLUG_FIELDS = ["playlistSlug", "playlist_slug", "collectionSlug"] as const;

export type VideoOwnership =
  | {
      kind: "playlist";
      playlistId: string | null;
      playlistSlug: string;
      playlistTitle: string;
      indexSlug: string;
    }
  | {
      kind: "standalone";
    }
  | {
      kind: "unresolved";
      playlistTitle: string | null;
      indexSlug: string | null;
      reason: string;
    };

export type PlaylistOwnershipEntry = {
  indexSlug: string;
  indexFileId: string;
  title: string;
  playlistId: string | null;
  slug: string;
  folderPaths: string[];
  resolved: boolean;
  fileIds: Set<string>;
  videoIds: Set<string>;
};

export type PlaylistOwnershipRegistry = {
  entries: PlaylistOwnershipEntry[];
  byFileId: Map<string, PlaylistOwnershipEntry>;
  byVideoId: Map<string, PlaylistOwnershipEntry>;
  byPlaylistId: Map<string, PlaylistOwnershipEntry>;
  bySlug: Map<string, PlaylistOwnershipEntry>;
  byTitleKey: Map<string, PlaylistOwnershipEntry>;
  folderPaths: Array<{ path: string; entry: PlaylistOwnershipEntry }>;
  unresolvedFolderPaths: Set<string>;
};

function readMetadataString(
  metadata: LifeLabNoteMetadata | undefined,
  field: string,
): string | null {
  const value = metadata?.[field as keyof LifeLabNoteMetadata];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

export function resolveNoteYoutubeVideoId(
  note: Pick<LifeLabNoteSummary, "metadata">,
): string | null {
  const metadata = note.metadata;

  if (!metadata) {
    return null;
  }

  const idFields = [
    metadata.videoId,
    metadata.youtubeVideoId,
    metadata.video_id,
    metadata.youtube_video_id,
  ];

  for (const candidate of idFields) {
    if (candidate && extractYouTubeVideoId(candidate)) {
      return extractYouTubeVideoId(candidate);
    }
  }

  const urlFields = [
    metadata.video_url,
    metadata.source_url,
    metadata.youtubeUrl,
    metadata.youtube_url,
    metadata.sourceUrl,
  ];

  for (const candidate of urlFields) {
    const videoId = candidate ? extractYouTubeVideoId(candidate) : null;

    if (videoId) {
      return videoId;
    }
  }

  return null;
}

function normalizeFolderPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function addRegistryEntry(
  registry: PlaylistOwnershipRegistry,
  entry: PlaylistOwnershipEntry,
): void {
  registry.entries.push(entry);
  registry.byFileId.set(entry.indexFileId, entry);
  registry.bySlug.set(entry.slug, entry);
  registry.byTitleKey.set(playlistTitleKey(entry.title), entry);

  if (entry.playlistId) {
    registry.byPlaylistId.set(entry.playlistId, entry);
  }

  for (const fileId of entry.fileIds) {
    registry.byFileId.set(fileId, entry);
  }

  for (const videoId of entry.videoIds) {
    registry.byVideoId.set(videoId, entry);
  }

  for (const folderPath of entry.folderPaths) {
    const normalized = normalizeFolderPath(folderPath);

    if (!normalized) {
      continue;
    }

    registry.folderPaths.push({ path: normalized, entry });

    if (!entry.resolved) {
      registry.unresolvedFolderPaths.add(normalized);
    }
  }
}

function resolveIndexPlaylistId(metadata?: LifeLabNoteMetadata): string | null {
  if (!metadata) {
    return null;
  }

  for (const field of PLAYLIST_ID_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (value) {
      return value;
    }
  }

  return null;
}

function collectContentOwnership(
  indexNote: LifeLabNoteSummary,
  contentNotes: LifeLabNoteSummary[],
  entry: PlaylistOwnershipEntry,
): void {
  for (const note of contentNotes) {
    if (note.fileId?.trim()) {
      entry.fileIds.add(note.fileId.trim());
    }

    const videoId = resolveNoteYoutubeVideoId(note);

    if (videoId) {
      entry.videoIds.add(videoId);
    }
  }
}

export function buildPlaylistOwnershipRegistry(
  notes: LifeLabNoteSummary[],
): PlaylistOwnershipRegistry {
  const registry: PlaylistOwnershipRegistry = {
    entries: [],
    byFileId: new Map(),
    byVideoId: new Map(),
    byPlaylistId: new Map(),
    bySlug: new Map(),
    byTitleKey: new Map(),
    folderPaths: [],
    unresolvedFolderPaths: new Set(),
  };

  for (const indexNote of notes) {
    if (!isValidPlaylistBrowseIndex("youtube-learning", indexNote)) {
      continue;
    }

    const collection = resolveCollection(indexNote, notes);
    const title = formatCollectionDisplayTitle({
      title: indexNote.title,
      metadata: indexNote.metadata,
    });
    const slug = normalizeCollectionSlug(collectionSlugFromIndexNote(indexNote));
    const folderPaths = new Set<string>();

    if (collection.folderPath) {
      folderPaths.add(collection.folderPath);
    }

    folderPaths.add(slug);

    const entry: PlaylistOwnershipEntry = {
      indexSlug: indexNote.slug,
      indexFileId: indexNote.fileId,
      title,
      playlistId: resolveIndexPlaylistId(indexNote.metadata),
      slug,
      folderPaths: [...folderPaths],
      resolved: collection.resolved,
      fileIds: new Set<string>(),
      videoIds: new Set<string>(),
    };

    collectContentOwnership(indexNote, collection.contentNotes, entry);
    addRegistryEntry(registry, entry);
  }

  registry.folderPaths.sort(
    (left, right) => right.path.length - left.path.length,
  );

  return registry;
}

function ownershipFromEntry(
  entry: PlaylistOwnershipEntry,
): VideoOwnership {
  if (!entry.resolved) {
    return {
      kind: "unresolved",
      playlistTitle: entry.title,
      indexSlug: entry.indexSlug,
      reason: "Playlist collection is not fully resolved",
    };
  }

  return {
    kind: "playlist",
    playlistId: entry.playlistId,
    playlistSlug: entry.slug,
    playlistTitle: entry.title,
    indexSlug: entry.indexSlug,
  };
}

function findEntryByFrontmatter(
  metadata: LifeLabNoteMetadata | undefined,
  registry: PlaylistOwnershipRegistry,
): PlaylistOwnershipEntry | null {
  if (!metadata) {
    return null;
  }

  for (const field of PLAYLIST_ID_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (value) {
      const entry = registry.byPlaylistId.get(value);

      if (entry) {
        return entry;
      }
    }
  }

  for (const field of PLAYLIST_SLUG_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (value) {
      const slug = normalizeCollectionSlug(value);
      const entry = registry.bySlug.get(slug);

      if (entry) {
        return entry;
      }
    }
  }

  for (const field of PLAYLIST_PATH_FIELDS) {
    const value = readMetadataString(metadata, field);

    if (!value) {
      continue;
    }

    const normalized = normalizeFolderPath(value);

    for (const folder of registry.folderPaths) {
      if (
        normalized === folder.path ||
        normalized.endsWith(`/${folder.path}`) ||
        folder.path.endsWith(`/${normalized}`)
      ) {
        return folder.entry;
      }
    }
  }

  const playlistTitle = metadata.playlist?.trim();

  if (playlistTitle) {
    return registry.byTitleKey.get(playlistTitleKey(playlistTitle)) ?? null;
  }

  return null;
}

function findEntryByFolderPath(
  note: Pick<LifeLabNoteSummary, "relativePath" | "subfolderLabel">,
  registry: PlaylistOwnershipRegistry,
): PlaylistOwnershipEntry | null {
  for (const folder of registry.folderPaths) {
    if (isNoteUnderFolderPath(note.relativePath, folder.path)) {
      return folder.entry;
    }
  }

  const subfolder = note.subfolderLabel?.trim();

  if (subfolder && subfolder !== "videos" && subfolder !== "playlists") {
    const slug = normalizeCollectionSlug(subfolder);
    const bySlug = registry.bySlug.get(slug);

    if (bySlug) {
      return bySlug;
    }

    for (const folder of registry.folderPaths) {
      if (
        folder.path === subfolder ||
        folder.path.endsWith(`/${subfolder}`) ||
        subfolder.endsWith(folder.path)
      ) {
        return folder.entry;
      }
    }
  }

  return null;
}

function isUnderUnresolvedPlaylistFolder(
  note: Pick<LifeLabNoteSummary, "relativePath" | "subfolderLabel">,
  registry: PlaylistOwnershipRegistry,
): boolean {
  for (const folderPath of registry.unresolvedFolderPaths) {
    if (isNoteUnderFolderPath(note.relativePath, folderPath)) {
      return true;
    }
  }

  const subfolder = note.subfolderLabel?.trim().toLowerCase();

  return Boolean(subfolder && registry.unresolvedFolderPaths.has(subfolder));
}

function isGeneralYoutubeCandidate(note: LifeLabNoteSummary): boolean {
  if (isNonPlayableMetadataNote(note)) {
    return false;
  }

  return isPlayableYoutubeNote(note) || Boolean(note.subfolderLabel?.trim());
}

export function classifyVideoOwnership(
  note: LifeLabNoteSummary,
  registry: PlaylistOwnershipRegistry,
): VideoOwnership | null {
  if (!isGeneralYoutubeCandidate(note)) {
    return null;
  }

  const fileId = note.fileId?.trim();

  if (fileId) {
    const byFile = registry.byFileId.get(fileId);

    if (byFile && byFile.indexFileId !== fileId) {
      return ownershipFromEntry(byFile);
    }
  }

  const videoId = resolveNoteYoutubeVideoId(note);

  if (videoId) {
    const byVideo = registry.byVideoId.get(videoId);

    if (byVideo) {
      return ownershipFromEntry(byVideo);
    }
  }

  const byFrontmatter = findEntryByFrontmatter(note.metadata, registry);

  if (byFrontmatter) {
    return ownershipFromEntry(byFrontmatter);
  }

  const byFolder = findEntryByFolderPath(note, registry);

  if (byFolder) {
    return ownershipFromEntry(byFolder);
  }

  if (isUnderUnresolvedPlaylistFolder(note, registry)) {
    return {
      kind: "unresolved",
      playlistTitle: note.metadata?.playlist?.trim() ?? null,
      indexSlug: null,
      reason: "Playlist membership could not be resolved",
    };
  }

  const metadataPlaylist = note.metadata?.playlist?.trim();

  if (
    metadataPlaylist &&
    !isInternalPlaylistTitle(metadataPlaylist) &&
    isPlayableYoutubeNote(note)
  ) {
    const byTitle = registry.byTitleKey.get(playlistTitleKey(metadataPlaylist));

    if (byTitle) {
      return ownershipFromEntry(byTitle);
    }

    return {
      kind: "playlist",
      playlistId: resolveIndexPlaylistId(note.metadata),
      playlistSlug: normalizeCollectionSlug(metadataPlaylist),
      playlistTitle: metadataPlaylist,
      indexSlug: "",
    };
  }

  if (!isPlayableYoutubeNote(note)) {
    return null;
  }

  return { kind: "standalone" };
}

export function isStandaloneVideoOwnership(
  ownership: VideoOwnership | null,
): ownership is Extract<VideoOwnership, { kind: "standalone" }> {
  return ownership?.kind === "standalone";
}

export function isPlaylistVideoOwnership(
  ownership: VideoOwnership | null,
): ownership is Extract<VideoOwnership, { kind: "playlist" }> {
  return ownership?.kind === "playlist";
}

export function resolvePlaylistContextLabel(
  ownership: VideoOwnership | null,
): string | null {
  if (ownership?.kind === "playlist") {
    return ownership.playlistTitle;
  }

  if (ownership?.kind === "unresolved" && ownership.playlistTitle) {
    return ownership.playlistTitle;
  }

  return null;
}
