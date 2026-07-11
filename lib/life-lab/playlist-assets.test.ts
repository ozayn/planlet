import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPlaylistAssetsBundle,
  orderPlaylistAssetsForDisplay,
  preparePlaylistAssetMarkdown,
  resolvePlaylistAssetRecords,
  resolvePlaylistAssetsForIndexNote,
  suppressDuplicatePlaylistIndexContent,
} from "@/lib/life-lab/playlist-assets";
import { isPlaylistAssetRelativePath } from "@/lib/life-lab/playlist-asset-paths";
import { resolvePlaylistAssetFolder } from "@/lib/life-lab/playlist-asset-resolution";
import type { LifeLabSectionNoteRecord } from "@/lib/life-lab/enrichment";

export const WESTERN_PHILOSOPHY_PLAYLIST_ID =
  "plwxnmb28xmpeypjmhfnbj4rafkrtman3p";

function indexNote(
  overrides: Partial<{
    metadata: Record<string, string>;
    content: string;
  }> = {},
) {
  return {
    slug: "playlists__western-philosophy-index",
    title: "Western Philosophy Index",
    excerpt: "",
    fileId: "western-index-file",
    relativePath: "playlists/western-philosophy-index.md",
    subfolderLabel: "playlists",
    metadata: {
      type: "playlist-index",
      playlist: "Western Philosophy",
      playlist_id: WESTERN_PHILOSOPHY_PLAYLIST_ID,
      ...overrides.metadata,
    },
    content: overrides.content,
  };
}

function record(
  relativePath: string,
  fileId: string,
): LifeLabSectionNoteRecord {
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

function westernPhilosophyAssetRecords(): LifeLabSectionNoteRecord[] {
  const base = `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}`;

  return [
    record(`${base}/playlist-learning-map.md`, "western-map"),
    record(`${base}/playlist-summary.md`, "western-summary"),
    record(`${base}/concept-frequencies.md`, "western-concepts"),
    record(`${base}/people-index.md`, "western-people"),
    record(`${base}/topic-graph.md`, "western-topic-graph"),
    record("playlists/western-philosophy/videos/episode-01.md", "western-video"),
  ];
}

describe("playlist asset paths", () => {
  it("detects shared assets folder files", () => {
    assert.equal(
      isPlaylistAssetRelativePath(
        `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}/playlist-learning-map.md`,
      ),
      true,
    );
    assert.equal(
      isPlaylistAssetRelativePath("playlists/western-philosophy/videos/episode-01.md"),
      false,
    );
  });
});

describe("playlist asset resolution", () => {
  it("resolves Western Philosophy assets from playlist_id frontmatter", () => {
    const resolution = resolvePlaylistAssetFolder({
      indexNote: indexNote(),
      records: westernPhilosophyAssetRecords(),
    });

    assert.equal(resolution?.playlistId, WESTERN_PHILOSOPHY_PLAYLIST_ID);
    assert.equal(
      resolution?.assetsRelativePath,
      `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}`,
    );
    assert.equal(resolution?.source, "frontmatter-playlist_id");
  });

  it("resolves assets path from explicit assets_path metadata", () => {
    const resolution = resolvePlaylistAssetFolder({
      indexNote: indexNote({
        metadata: {
          assets_path: `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}`,
        },
      }),
    });

    assert.equal(resolution?.playlistId, WESTERN_PHILOSOPHY_PLAYLIST_ID);
    assert.equal(resolution?.source, "frontmatter-assets_path");
  });

  it("resolves assets folder from markdown links in the index body", () => {
    const resolution = resolvePlaylistAssetFolder({
      indexNote: {
        ...indexNote(),
        metadata: { type: "playlist-index", playlist: "Western Philosophy" },
      },
      body: `[Learning Map](playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}/playlist-learning-map.md)`,
      records: westernPhilosophyAssetRecords(),
    });

    assert.equal(resolution?.playlistId, WESTERN_PHILOSOPHY_PLAYLIST_ID);
    assert.equal(resolution?.source, "markdown-link");
  });

  it("resolves only present asset files for Western Philosophy", () => {
    const { resolution, matches } = resolvePlaylistAssetsForIndexNote(
      indexNote(),
      westernPhilosophyAssetRecords(),
    );

    assert.equal(resolution?.playlistId, WESTERN_PHILOSOPHY_PLAYLIST_ID);
    assert.deepEqual(
      matches.map((match) => match.definition.id),
      [
        "learning-map",
        "summary",
        "concept-frequencies",
        "people",
        "topic-graph",
      ],
    );
  });
});

describe("playlist asset rendering", () => {
  it("orders primary assets before secondary sections", () => {
    const ordered = orderPlaylistAssetsForDisplay([
      {
        id: "topic-graph",
        title: "Topic Graph",
        content: "graph",
        tier: "secondary",
        relativePath: `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}/topic-graph.md`,
        fileId: "g",
        modifiedAt: null,
        unavailable: false,
        error: null,
        contentHash: "a",
      },
      {
        id: "learning-map",
        title: "Learning Map",
        content: "map",
        tier: "primary",
        relativePath: `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}/playlist-learning-map.md`,
        fileId: "m",
        modifiedAt: null,
        unavailable: false,
        error: null,
        contentHash: "b",
      },
      {
        id: "summary",
        title: "Playlist Summary",
        content: "summary",
        tier: "primary",
        relativePath: `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}/playlist-summary.md`,
        fileId: "s",
        modifiedAt: null,
        unavailable: false,
        error: null,
        contentHash: "c",
      },
      {
        id: "concept-frequencies",
        title: "Concept Frequencies",
        content: "concepts",
        tier: "secondary",
        relativePath: `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}/concept-frequencies.md`,
        fileId: "c",
        modifiedAt: null,
        unavailable: false,
        error: null,
        contentHash: "d",
      },
    ]);

    assert.deepEqual(
      ordered.map((asset) => asset.id),
      ["learning-map", "summary", "concept-frequencies", "topic-graph"],
    );
  });

  it("normalizes learning-map mermaid direction in standalone asset files", () => {
    const prepared = preparePlaylistAssetMarkdown(
      [
        "# Learning Map",
        "",
        "```mermaid",
        "graph LR",
        "  A --> B",
        "```",
      ].join("\n"),
      {
        id: "learning-map",
        filename: "playlist-learning-map.md",
        fallbackTitle: "Learning Map",
        tier: "primary",
        normalizeMermaid: true,
      },
    );

    assert.match(prepared, /graph TD/);
    assert.doesNotMatch(prepared, /graph LR/);
  });

  it("suppresses duplicate learning map content from the playlist index", () => {
    const mermaid = ["```mermaid", "graph LR", "  A --> B", "```"].join("\n");
    const indexBody = ["## Learning Map", "", mermaid, "", "## Videos", "", "| # | Title |"].join(
      "\n",
    );
    const preparedAsset = preparePlaylistAssetMarkdown(mermaid, {
      id: "learning-map",
      filename: "playlist-learning-map.md",
      fallbackTitle: "Learning Map",
      tier: "primary",
      normalizeMermaid: true,
    });

    const { body, suppressedDuplicates } = suppressDuplicatePlaylistIndexContent({
      indexBody,
      assets: [
        {
          id: "learning-map",
          title: "Learning Map",
          content: preparedAsset,
          tier: "primary",
          relativePath: `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}/playlist-learning-map.md`,
          fileId: "map",
          modifiedAt: null,
          unavailable: false,
          error: null,
          contentHash: "hash",
        },
      ],
    });

    assert.deepEqual(suppressedDuplicates, ["index-learning-map"]);
    assert.doesNotMatch(body, /```mermaid/);
    assert.match(body, /## Videos/);
  });

  it("builds unavailable state for a failed asset without affecting others", () => {
    const base = `playlists/assets/${WESTERN_PHILOSOPHY_PLAYLIST_ID}`;
    const bundle = buildPlaylistAssetsBundle({
      folder: {
        status: "resolved",
        playlistId: WESTERN_PHILOSOPHY_PLAYLIST_ID,
        assetsFolderId: WESTERN_PHILOSOPHY_PLAYLIST_ID,
        relativePath: base,
        source: "frontmatter-playlist_id",
      },
      resolution: {
        playlistId: WESTERN_PHILOSOPHY_PLAYLIST_ID,
        assetsFolderId: WESTERN_PHILOSOPHY_PLAYLIST_ID,
        assetsRelativePath: base,
        relativePath: base,
        source: "frontmatter-playlist_id",
      },
      matches: [
        {
          definition: {
            id: "summary",
            filename: "playlist-summary.md",
            fallbackTitle: "Playlist Summary",
            tier: "primary",
            normalizeMermaid: false,
          },
          record: record(`${base}/playlist-summary.md`, "summary-file"),
          relativePath: `${base}/playlist-summary.md`,
        },
      ],
      loaded: [
        {
          match: {
            definition: {
              id: "summary",
              filename: "playlist-summary.md",
              fallbackTitle: "Playlist Summary",
              tier: "primary",
              normalizeMermaid: false,
            },
            record: record(`${base}/playlist-summary.md`, "summary-file"),
            relativePath: `${base}/playlist-summary.md`,
          },
          content: null,
          rawBody: null,
          fromCache: false,
          error: "Drive read failed",
        },
      ],
    });

    assert.equal(bundle.artifacts.length, 1);
    assert.equal(bundle.artifacts[0]?.unavailable, true);
    assert.equal(
      bundle.diagnostics.find((item) => item.id === "timeline")?.found,
      false,
    );
  });
});

describe("Western Philosophy playlist asset fixture", () => {
  it("maps the known assets folder to supported filenames", () => {
    const records = westernPhilosophyAssetRecords();
    const resolution = resolvePlaylistAssetFolder({
      indexNote: indexNote(),
      records,
    });

    assert.ok(resolution);
    const matches = resolvePlaylistAssetRecords(resolution!, records);

    assert.ok(
      matches.some((match) => match.definition.id === "learning-map"),
    );
    assert.ok(matches.some((match) => match.definition.id === "summary"));
    assert.ok(
      matches.some((match) => match.definition.id === "concept-frequencies"),
    );
    assert.ok(matches.some((match) => match.definition.id === "people"));
    assert.ok(matches.some((match) => match.definition.id === "topic-graph"));
    assert.equal(
      matches.some((match) => match.definition.id === "timeline"),
      false,
    );
  });
});
