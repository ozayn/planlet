import type { LifeLabNoteMetadata, LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  PLAYLIST_ASSETS_ROOT,
  parsePlaylistAssetRelativePath,
} from "@/lib/life-lab/playlist-asset-paths";
import type { LifeLabSectionNoteRecord } from "@/lib/life-lab/enrichment";

export type PlaylistAssetResolutionSource =
  | "frontmatter-playlist_asset_path"
  | "frontmatter-assets_path"
  | "frontmatter-playlist_id"
  | "frontmatter-asset_folder_id"
  | "markdown-link"
  | "markdown-path"
  | "record-match";

export type PlaylistAssetResolution = {
  playlistId: string;
  assetsRelativePath: string;
  assetsFolderId: string;
  relativePath: string;
  source: PlaylistAssetResolutionSource;
};

export type PlaylistAssetsFolderResult =
  | {
      status: "resolved";
      playlistId: string;
      assetsFolderId: string;
      relativePath: string;
      source: PlaylistAssetResolutionSource;
    }
  | {
      status: "ambiguous";
      candidates: string[];
      diagnostic: string;
    }
  | {
      status: "unresolved";
      diagnostic: string;
    };

const PLAYLIST_ID_PATTERN = /^[a-z0-9]{16,}$/i;

const ASSETS_PATH_PATTERN =
  /(?:^|\/)(?:playlists\/)?assets\/([a-z0-9]{16,})(?:\/|$)/i;

const MARKDOWN_ASSET_LINK_PATTERN =
  /\[[^\]]*\]\((?:[^)]*\/)?assets\/([a-z0-9]{16,})\/[^)]+\)/gi;

const MARKDOWN_ASSET_PATH_PATTERN =
  /(?:^|[^\w])(?:playlists\/)?assets\/([a-z0-9]{16,})\//gi;

const EXPLICIT_PATH_FIELDS: Array<{
  field: keyof LifeLabNoteMetadata;
  source: PlaylistAssetResolutionSource;
}> = [
  { field: "playlistAssetPath", source: "frontmatter-playlist_asset_path" },
  { field: "playlist_asset_path", source: "frontmatter-playlist_asset_path" },
  { field: "assetPath", source: "frontmatter-assets_path" },
  { field: "assets_path", source: "frontmatter-assets_path" },
  { field: "assetsPath", source: "frontmatter-assets_path" },
  { field: "asset_path", source: "frontmatter-assets_path" },
];

const EXPLICIT_ID_FIELDS: Array<{
  field: keyof LifeLabNoteMetadata;
  source: PlaylistAssetResolutionSource;
}> = [
  { field: "playlistId", source: "frontmatter-playlist_id" },
  { field: "playlist_id", source: "frontmatter-playlist_id" },
  { field: "assetFolderId", source: "frontmatter-asset_folder_id" },
  { field: "asset_folder_id", source: "frontmatter-asset_folder_id" },
  { field: "assetId", source: "frontmatter-asset_folder_id" },
  { field: "asset_id", source: "frontmatter-asset_folder_id" },
];

function normalizePlaylistId(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const pathMatch = trimmed.match(ASSETS_PATH_PATTERN);

  if (pathMatch?.[1]) {
    return pathMatch[1].toLowerCase();
  }

  if (PLAYLIST_ID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

function resolutionFromPlaylistId(
  playlistId: string,
  source: PlaylistAssetResolutionSource,
): PlaylistAssetResolution {
  const assetsRelativePath = `${PLAYLIST_ASSETS_ROOT}/${playlistId}`;

  return {
    playlistId,
    assetsFolderId: playlistId,
    assetsRelativePath,
    relativePath: assetsRelativePath,
    source,
  };
}

function collectExplicitCandidates(
  metadata?: LifeLabNoteMetadata,
): Array<{ playlistId: string; source: PlaylistAssetResolutionSource }> {
  if (!metadata) {
    return [];
  }

  const candidates: Array<{
    playlistId: string;
    source: PlaylistAssetResolutionSource;
  }> = [];

  for (const entry of EXPLICIT_PATH_FIELDS) {
    const value = metadata[entry.field];

    if (typeof value !== "string") {
      continue;
    }

    const playlistId = normalizePlaylistId(value);

    if (playlistId) {
      candidates.push({ playlistId, source: entry.source });
    }
  }

  for (const entry of EXPLICIT_ID_FIELDS) {
    const value = metadata[entry.field];

    if (typeof value !== "string") {
      continue;
    }

    const playlistId = normalizePlaylistId(value);

    if (playlistId) {
      candidates.push({ playlistId, source: entry.source });
    }
  }

  return candidates;
}

function uniquePlaylistIds(
  candidates: Array<{ playlistId: string; source: PlaylistAssetResolutionSource }>,
): string[] {
  return [...new Set(candidates.map((candidate) => candidate.playlistId))];
}

function playlistIdsFromMarkdown(body: string): string[] {
  if (!body.trim()) {
    return [];
  }

  const ids = new Set<string>();

  for (const match of body.matchAll(MARKDOWN_ASSET_LINK_PATTERN)) {
    const playlistId = match[1] ? normalizePlaylistId(match[1]) : null;

    if (playlistId) {
      ids.add(playlistId);
    }
  }

  for (const match of body.matchAll(MARKDOWN_ASSET_PATH_PATTERN)) {
    const playlistId = match[1] ? normalizePlaylistId(match[1]) : null;

    if (playlistId) {
      ids.add(playlistId);
    }
  }

  return [...ids];
}

function listAssetFolderIdsFromRecords(
  records: LifeLabSectionNoteRecord[],
): string[] {
  const ids = new Set<string>();

  for (const record of records) {
    const parsed = parsePlaylistAssetRelativePath(record.relativePath);

    if (parsed) {
      ids.add(parsed.playlistId.toLowerCase());
    }
  }

  return [...ids];
}

function playlistIdsFromRecordMatch(
  indexNote: Pick<LifeLabNoteSummary, "metadata" | "relativePath">,
  body: string,
  records: LifeLabSectionNoteRecord[],
): string[] {
  const folderIds = listAssetFolderIdsFromRecords(records);

  if (folderIds.length === 0) {
    return [];
  }

  const haystack = [
    body,
    indexNote.metadata?.playlistAssetPath,
    indexNote.metadata?.playlist_asset_path,
    indexNote.metadata?.assets_path,
    indexNote.metadata?.assetsPath,
    indexNote.metadata?.asset_path,
    indexNote.metadata?.assetPath,
    indexNote.metadata?.playlist_id,
    indexNote.metadata?.playlistId,
    indexNote.metadata?.assetFolderId,
    indexNote.metadata?.asset_folder_id,
    indexNote.metadata?.asset_id,
    indexNote.metadata?.assetId,
    indexNote.relativePath,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  return folderIds.filter((folderId) => haystack.includes(folderId));
}

export function resolvePlaylistAssetsFolder(input: {
  indexNote: Pick<
    LifeLabNoteSummary,
    | "slug"
    | "title"
    | "fileId"
    | "relativePath"
    | "subfolderLabel"
    | "metadata"
    | "excerpt"
  >;
  body?: string;
  records?: LifeLabSectionNoteRecord[];
}): PlaylistAssetsFolderResult {
  const explicitCandidates = collectExplicitCandidates(
    input.indexNote.metadata,
  );
  const explicitIds = uniquePlaylistIds(explicitCandidates);

  if (explicitIds.length > 1) {
    return {
      status: "ambiguous",
      candidates: explicitIds,
      diagnostic:
        "Multiple explicit playlist asset folders were found in metadata.",
    };
  }

  const markdownIds = playlistIdsFromMarkdown(input.body ?? "");

  if (explicitIds.length === 1 && markdownIds.length > 0) {
    const explicitId = explicitIds[0];
    const conflictingMarkdown = markdownIds.filter((id) => id !== explicitId);

    if (conflictingMarkdown.length > 0) {
      return {
        status: "ambiguous",
        candidates: [explicitId, ...conflictingMarkdown],
        diagnostic:
          "Explicit playlist metadata conflicts with asset links in the index body.",
      };
    }
  }

  if (explicitIds.length === 0 && markdownIds.length > 1) {
    return {
      status: "ambiguous",
      candidates: markdownIds,
      diagnostic:
        "Multiple asset folders were linked from the playlist index body.",
    };
  }

  if (explicitIds.length === 1) {
    const explicit = explicitCandidates[0];

    return {
      status: "resolved",
      playlistId: explicit.playlistId,
      assetsFolderId: explicit.playlistId,
      relativePath: `${PLAYLIST_ASSETS_ROOT}/${explicit.playlistId}`,
      source: explicit.source,
    };
  }

  if (markdownIds.length === 1) {
    const playlistId = markdownIds[0];

    return {
      status: "resolved",
      playlistId,
      assetsFolderId: playlistId,
      relativePath: `${PLAYLIST_ASSETS_ROOT}/${playlistId}`,
      source: "markdown-link",
    };
  }

  if (input.records && input.records.length > 0) {
    const recordMatches = playlistIdsFromRecordMatch(
      input.indexNote,
      input.body ?? "",
      input.records,
    );

    if (recordMatches.length > 1) {
      return {
        status: "ambiguous",
        candidates: recordMatches,
        diagnostic:
          "Multiple asset folders matched the playlist index without explicit metadata.",
      };
    }

    if (recordMatches.length === 1) {
      const playlistId = recordMatches[0];

      return {
        status: "resolved",
        playlistId,
        assetsFolderId: playlistId,
        relativePath: `${PLAYLIST_ASSETS_ROOT}/${playlistId}`,
        source: "record-match",
      };
    }
  }

  return {
    status: "unresolved",
    diagnostic: "No explicit playlist asset folder could be resolved.",
  };
}

export function resolvePlaylistAssetFolder(input: {
  indexNote: Pick<
    LifeLabNoteSummary,
    | "slug"
    | "title"
    | "fileId"
    | "relativePath"
    | "subfolderLabel"
    | "metadata"
    | "excerpt"
  >;
  body?: string;
  records?: LifeLabSectionNoteRecord[];
}): PlaylistAssetResolution | null {
  const folder = resolvePlaylistAssetsFolder(input);

  if (folder.status !== "resolved") {
    return null;
  }

  return resolutionFromPlaylistId(folder.playlistId, folder.source);
}

export function playlistAssetsCacheKeyParts(input: {
  sectionId: string;
  playlistId: string;
  indexSlug: string;
}): {
  bundleCacheKey: string[];
  learningMapCacheKey: string[];
} {
  return {
    bundleCacheKey: [
      "life-lab-playlist-assets",
      input.sectionId,
      input.playlistId,
      input.indexSlug,
    ],
    learningMapCacheKey: [
      "life-lab-playlist-learning-map",
      input.playlistId,
    ],
  };
}
