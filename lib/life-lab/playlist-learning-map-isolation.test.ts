import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lifeLabPlaylistLearningMapCacheTag } from "@/lib/life-lab/cache";
import {
  buildPlaylistAssetsBundle,
  extractLearningMapSignature,
  preparePlaylistAssetMarkdown,
  resolvePlaylistAssetRecords,
  resolvePlaylistAssetsForIndexNote,
} from "@/lib/life-lab/playlist-assets";
import {
  playlistAssetsCacheKeyParts,
  resolvePlaylistAssetsFolder,
} from "@/lib/life-lab/playlist-asset-resolution";
import type { LifeLabSectionNoteRecord } from "@/lib/life-lab/enrichment";

export const PLAYLIST_A_ID = "aaaaaaaaaaaaaaaaaaaaaaaaa";
export const PLAYLIST_B_ID = "bbbbbbbbbbbbbbbbbbbbbbbbbb";
export const PLAYLIST_C_ID = "ccccccccccccccccccccccccc";

function indexForPlaylist(input: {
  slug: string;
  title: string;
  playlistId: string;
}) {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: "",
    fileId: `file-${input.slug}`,
    relativePath: `playlists/${input.slug}.md`,
    subfolderLabel: "playlists",
    metadata: {
      type: "playlist-index",
      playlist: input.title,
      playlist_id: input.playlistId,
    },
  };
}

function record(relativePath: string, fileId: string): LifeLabSectionNoteRecord {
  return {
    slug: relativePath.replace(/\//g, "__").replace(/\.md$/, ""),
    title: relativePath,
    excerpt: "",
    modifiedAt: "2026-07-11T10:00:00.000Z",
    modifiedAtLabel: "Jul 11",
    dateLabel: null,
    subfolderLabel: "playlists",
    fileId,
    relativePath,
    metadata: {},
    searchText: "",
    hasFlashcards: false,
    flashcardCount: 0,
  };
}

function learningMapBody(signature: string): string {
  return [
    "# Learning Map",
    "",
    "```mermaid",
    "graph TD",
    `  A[${signature}]`,
    "```",
  ].join("\n");
}

function fixtureRecords(): LifeLabSectionNoteRecord[] {
  return [
    record(
      `playlists/assets/${PLAYLIST_A_ID}/playlist-learning-map.md`,
      "a-map",
    ),
    record(
      `playlists/assets/${PLAYLIST_B_ID}/playlist-learning-map.md`,
      "b-map",
    ),
    record(`playlists/assets/${PLAYLIST_A_ID}/playlist-summary.md`, "a-summary"),
    record(`playlists/assets/${PLAYLIST_B_ID}/playlist-summary.md`, "b-summary"),
  ];
}

describe("playlist learning map isolation", () => {
  it("resolves playlist A to only playlist A asset files", () => {
    const { folder, resolution, matches } = resolvePlaylistAssetsForIndexNote(
      indexForPlaylist({
        slug: "playlists__playlist-a-index",
        title: "Playlist A",
        playlistId: PLAYLIST_A_ID,
      }),
      fixtureRecords(),
    );

    assert.equal(folder.status, "resolved");
    assert.equal(resolution?.playlistId, PLAYLIST_A_ID);
    assert.deepEqual(
      matches.map((match) => match.relativePath),
      [
        `playlists/assets/${PLAYLIST_A_ID}/playlist-learning-map.md`,
        `playlists/assets/${PLAYLIST_A_ID}/playlist-summary.md`,
      ],
    );
  });

  it("resolves playlist B to only playlist B asset files", () => {
    const { resolution, matches } = resolvePlaylistAssetsForIndexNote(
      indexForPlaylist({
        slug: "playlists__playlist-b-index",
        title: "Playlist B",
        playlistId: PLAYLIST_B_ID,
      }),
      fixtureRecords(),
    );

    assert.equal(resolution?.playlistId, PLAYLIST_B_ID);
    assert.deepEqual(
      matches.map((match) => match.relativePath),
      [
        `playlists/assets/${PLAYLIST_B_ID}/playlist-learning-map.md`,
        `playlists/assets/${PLAYLIST_B_ID}/playlist-summary.md`,
      ],
    );
  });

  it("loads distinct learning map signatures for playlist A and B", () => {
    const records = fixtureRecords();
    const resolutionA = resolvePlaylistAssetsFolder({
      indexNote: indexForPlaylist({
        slug: "playlists__playlist-a-index",
        title: "Playlist A",
        playlistId: PLAYLIST_A_ID,
      }),
      records,
    });
    const resolutionB = resolvePlaylistAssetsFolder({
      indexNote: indexForPlaylist({
        slug: "playlists__playlist-b-index",
        title: "Playlist B",
        playlistId: PLAYLIST_B_ID,
      }),
      records,
    });

    assert.equal(resolutionA.status, "resolved");
    assert.equal(resolutionB.status, "resolved");

    const loadedA = buildPlaylistAssetsBundle({
      folder: resolutionA,
      resolution: {
        playlistId: PLAYLIST_A_ID,
        assetsFolderId: PLAYLIST_A_ID,
        assetsRelativePath: `playlists/assets/${PLAYLIST_A_ID}`,
        relativePath: `playlists/assets/${PLAYLIST_A_ID}`,
        source: "frontmatter-playlist_id",
      },
      matches: resolvePlaylistAssetRecords(
        {
          playlistId: PLAYLIST_A_ID,
          assetsFolderId: PLAYLIST_A_ID,
          assetsRelativePath: `playlists/assets/${PLAYLIST_A_ID}`,
          relativePath: `playlists/assets/${PLAYLIST_A_ID}`,
          source: "frontmatter-playlist_id",
        },
        records,
      ),
      loaded: [
        {
          match: {
            definition: {
              id: "learning-map",
              filename: "playlist-learning-map.md",
              fallbackTitle: "Learning Map",
              tier: "primary",
              normalizeMermaid: true,
            },
            record: records[0]!,
            relativePath: records[0]!.relativePath,
          },
          content: preparePlaylistAssetMarkdown(
            learningMapBody("Soul and physicalism"),
            {
              id: "learning-map",
              filename: "playlist-learning-map.md",
              fallbackTitle: "Learning Map",
              tier: "primary",
              normalizeMermaid: true,
            },
          ),
          rawBody: learningMapBody("Soul and physicalism"),
          fromCache: false,
          error: null,
        },
      ],
    });

    const loadedB = buildPlaylistAssetsBundle({
      folder: resolutionB,
      resolution: {
        playlistId: PLAYLIST_B_ID,
        assetsFolderId: PLAYLIST_B_ID,
        assetsRelativePath: `playlists/assets/${PLAYLIST_B_ID}`,
        relativePath: `playlists/assets/${PLAYLIST_B_ID}`,
        source: "frontmatter-playlist_id",
      },
      matches: resolvePlaylistAssetRecords(
        {
          playlistId: PLAYLIST_B_ID,
          assetsFolderId: PLAYLIST_B_ID,
          assetsRelativePath: `playlists/assets/${PLAYLIST_B_ID}`,
          relativePath: `playlists/assets/${PLAYLIST_B_ID}`,
          source: "frontmatter-playlist_id",
        },
        records,
      ),
      loaded: [
        {
          match: {
            definition: {
              id: "learning-map",
              filename: "playlist-learning-map.md",
              fallbackTitle: "Learning Map",
              tier: "primary",
              normalizeMermaid: true,
            },
            record: records[1]!,
            relativePath: records[1]!.relativePath,
          },
          content: preparePlaylistAssetMarkdown(
            learningMapBody("Justice and fairness"),
            {
              id: "learning-map",
              filename: "playlist-learning-map.md",
              fallbackTitle: "Learning Map",
              tier: "primary",
              normalizeMermaid: true,
            },
          ),
          rawBody: learningMapBody("Justice and fairness"),
          fromCache: false,
          error: null,
        },
      ],
    });

    assert.equal(loadedA.learningMapSignature, "Soul and physicalism");
    assert.equal(loadedB.learningMapSignature, "Justice and fairness");
    assert.notEqual(
      loadedA.learningMapSignature,
      loadedB.learningMapSignature,
    );
  });

  it("does not load another playlist map when playlist C has no learning map file", () => {
    const { resolution, matches } = resolvePlaylistAssetsForIndexNote(
      indexForPlaylist({
        slug: "playlists__playlist-c-index",
        title: "Playlist C",
        playlistId: PLAYLIST_C_ID,
      }),
      fixtureRecords(),
    );

    assert.equal(resolution?.playlistId, PLAYLIST_C_ID);
    assert.equal(
      matches.some((match) => match.definition.id === "learning-map"),
      false,
    );
  });

  it("uses playlist-specific cache keys that do not leak across playlists", () => {
    const keysA = playlistAssetsCacheKeyParts({
      sectionId: "youtube-learning",
      playlistId: PLAYLIST_A_ID,
      indexSlug: "playlists__playlist-a-index",
    });
    const keysB = playlistAssetsCacheKeyParts({
      sectionId: "youtube-learning",
      playlistId: PLAYLIST_B_ID,
      indexSlug: "playlists__playlist-b-index",
    });

    assert.notDeepEqual(keysA.bundleCacheKey, keysB.bundleCacheKey);
    assert.notDeepEqual(keysA.learningMapCacheKey, keysB.learningMapCacheKey);
    assert.equal(
      lifeLabPlaylistLearningMapCacheTag(PLAYLIST_A_ID),
      `life-lab:playlist-learning-map:${PLAYLIST_A_ID}`,
    );
    assert.equal(
      lifeLabPlaylistLearningMapCacheTag(PLAYLIST_B_ID),
      `life-lab:playlist-learning-map:${PLAYLIST_B_ID}`,
    );
  });

  it("treats conflicting explicit metadata as ambiguous and loads no assets", () => {
    const indexNote = {
      ...indexForPlaylist({
        slug: "playlists__conflict-index",
        title: "Conflict",
        playlistId: PLAYLIST_A_ID,
      }),
      metadata: {
        type: "playlist-index",
        playlist_id: PLAYLIST_A_ID,
        assetFolderId: PLAYLIST_B_ID,
      },
    };
    const folder = resolvePlaylistAssetsFolder({
      indexNote,
      records: fixtureRecords(),
    });

    assert.equal(folder.status, "ambiguous");
    const resolved = resolvePlaylistAssetsForIndexNote(
      indexNote,
      fixtureRecords(),
    );

    assert.equal(resolved.resolution, null);
    assert.deepEqual(resolved.matches, []);
  });

  it("extracts learning map signatures from mermaid content", () => {
    assert.equal(
      extractLearningMapSignature(learningMapBody("Soul and physicalism")),
      "Soul and physicalism",
    );
  });
});
