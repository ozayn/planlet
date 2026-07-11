export const PLAYLIST_ASSETS_ROOT = "playlists/assets";

export const PLAYLIST_ASSET_FILENAMES = [
  "playlist-learning-map.md",
  "playlist-summary.md",
  "playlist-clusters.md",
  "playlist-full-concept-map.md",
  "concept-frequencies.md",
  "people-index.md",
  "topic-graph.md",
  "playlist-timeline.md",
  "playlist-people-map.md",
  "playlist-concept-map.md",
] as const;

export type PlaylistAssetFilename = (typeof PLAYLIST_ASSET_FILENAMES)[number];

const PLAYLIST_ASSET_PATH_PATTERN =
  /^playlists\/assets\/([^/]+)\/([^/]+\.md)$/i;

const PLAYLIST_CLUSTER_PATH_PATTERN =
  /^playlists\/assets\/([^/]+)\/clusters\/([^/]+\.md)$/i;

const PLAYLIST_ASSET_FOLDER_PATTERN =
  /^playlists\/assets\/([^/]+)(?:\/|$)/i;

export function isPlaylistClusterRelativePath(relativePath: string): boolean {
  return PLAYLIST_CLUSTER_PATH_PATTERN.test(
    relativePath.replace(/\\/g, "/"),
  );
}

export function isPlaylistAssetRelativePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");

  if (isPlaylistClusterRelativePath(normalized)) {
    return true;
  }

  const match = normalized.match(PLAYLIST_ASSET_PATH_PATTERN);

  if (!match) {
    return false;
  }

  const filename = match[2]?.toLowerCase();

  return PLAYLIST_ASSET_FILENAMES.some(
    (assetFilename) => assetFilename === filename,
  );
}

export function playlistAssetRelativePath(
  playlistId: string,
  filename: PlaylistAssetFilename,
): string {
  const normalizedId = playlistId.replace(/^\/+|\/+$/g, "");

  return `${PLAYLIST_ASSETS_ROOT}/${normalizedId}/${filename}`;
}

export function parsePlaylistAssetRelativePath(relativePath: string): {
  playlistId: string;
  filename: string;
} | null {
  const normalized = relativePath.replace(/\\/g, "/");
  const match = normalized.match(PLAYLIST_ASSET_PATH_PATTERN);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    playlistId: match[1],
    filename: match[2],
  };
}

export function parsePlaylistClusterRelativePath(relativePath: string): {
  playlistId: string;
  clusterSlug: string;
} | null {
  const normalized = relativePath.replace(/\\/g, "/");
  const match = normalized.match(PLAYLIST_CLUSTER_PATH_PATTERN);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    playlistId: match[1],
    clusterSlug: match[2].replace(/\.md$/i, ""),
  };
}

export function parsePlaylistAssetFolderId(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/");
  const match = normalized.match(PLAYLIST_ASSET_FOLDER_PATTERN);

  return match?.[1]?.toLowerCase() ?? null;
}
