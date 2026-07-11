import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatClusterRowMetadata,
  normalizeClusterSlug,
  parsePlaylistClusterRows,
  resolveClusterFileForRow,
  type PlaylistClusterFile,
} from "@/lib/life-lab/playlist-clusters";
import {
  buildPlaylistAssetsBundle,
  resolvePlaylistClusterRecords,
  type PlaylistAssetRecordMatch,
} from "@/lib/life-lab/playlist-assets";
import { PLAYLIST_ASSET_DEFINITIONS } from "@/lib/life-lab/playlist-assets";
import {
  deduplicatePlaylistArtifactsForDisplay,
  suppressDuplicatePlaylistIndexContent,
} from "@/lib/life-lab/playlist-artifact-content";
import type { PlaylistAssetView } from "@/lib/life-lab/playlist-assets";
import {
  lifeLabPlaylistClusterCacheTag,
  lifeLabPlaylistClustersCacheTag,
  lifeLabPlaylistFullMapCacheTag,
} from "@/lib/life-lab/cache";

function asset(
  partial: Partial<PlaylistAssetView> & Pick<PlaylistAssetView, "id">,
): PlaylistAssetView {
  return {
    title: partial.id,
    content: "",
    tier: partial.tier ?? "secondary",
    relativePath: `playlists/assets/test/${partial.id}.md`,
    fileId: `file-${partial.id}`,
    modifiedAt: null,
    unavailable: false,
    error: null,
    contentHash: null,
    ...partial,
  };
}

describe("playlist cluster assets", () => {
  it("parses playlist-clusters.md into clickable cluster rows", () => {
    const rows = parsePlaylistClusterRows(
      [
        "# Concept Clusters",
        "",
        "- **Mind and body** — Dualism, physicalism, soul",
        "- **Personal identity** — Body theory, soul theory, psychological continuity",
      ].join("\n"),
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.title, "Mind and body");
    assert.equal(rows[0]?.slug, "mind-and-body");
    assert.match(rows[0]?.description ?? "", /Dualism/);
    assert.equal(rows[1]?.slug, "personal-identity");
  });

  it("resolves cluster rows from explicit links and exact slug matches", () => {
    const row = {
      slug: "mind-and-body",
      title: "Mind and body",
      description: "Dualism, physicalism, soul",
      count: 3,
      clusterPath: "clusters/mind-and-body.md",
    };
    const clusterFiles: PlaylistClusterFile[] = [
      {
        slug: "mind-and-body",
        title: "Mind and body",
        content: "```mermaid\ngraph TD\n  A[Mind]\n```",
        mermaidCode: "graph TD\n  A[Mind]",
        relativePath: "playlists/assets/test/clusters/mind-and-body.md",
        fileId: "cluster-1",
        modifiedAt: null,
        unavailable: false,
        error: null,
      },
    ];

    assert.equal(resolveClusterFileForRow(row, clusterFiles)?.slug, "mind-and-body");
    assert.equal(
      resolveClusterFileForRow(
        { ...row, clusterPath: null },
        clusterFiles,
      )?.slug,
      "mind-and-body",
    );
    assert.equal(
      resolveClusterFileForRow(
        { ...row, slug: "missing", clusterPath: null },
        clusterFiles,
      ),
      null,
    );
  });

  it("discovers clusters/*.md files under the playlist assets folder", () => {
    const resolution = {
      playlistId: "plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
      assetsRelativePath: "playlists/assets/plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
      assetsFolderId: "plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
      relativePath: "playlists/assets/plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
      source: "record-match" as const,
    };
    const records = [
      {
        slug: "clusters__mind-and-body",
        title: "Mind and body",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: null,
        fileId: "cluster-1",
        relativePath:
          "playlists/assets/plwxnmb28xmpeypjmhfnbj4rafkrtman3p/clusters/mind-and-body.md",
        mimeType: null,
        fileSizeBytes: null,
      },
    ];

    const matches = resolvePlaylistClusterRecords(resolution, records);

    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.slug, "mind-and-body");
  });

  it("renders the compact learning map once and suppresses embedded duplicates", () => {
    const learningMap = asset({
      id: "learning-map",
      tier: "primary",
      content: ["```mermaid", "graph TD", "  A[Overview]", "```"].join("\n"),
      contentHash: "map",
    });
    const summary = asset({
      id: "summary",
      tier: "primary",
      content: "## Overview\n\nSummary text.",
      contentHash: "summary",
    });

    const prepared = deduplicatePlaylistArtifactsForDisplay([
      learningMap,
      summary,
    ]);
    const suppressed = suppressDuplicatePlaylistIndexContent({
      indexBody: [
        "## Learning Map",
        "",
        "```mermaid",
        "graph TD",
        "  A[Duplicate]",
        "```",
        "",
        "## Overview",
        "Inline summary",
      ].join("\n"),
      assets: prepared,
      presentAssetIds: ["learning-map", "summary"],
    });

    assert.equal(prepared.filter((item) => item.id === "learning-map").length, 1);
    assert.doesNotMatch(suppressed.body, /```mermaid/);
  });

  it("keeps the full concept map out of the primary analysis list until opened", () => {
    const fullMap = asset({
      id: "full-concept-map",
      tier: "secondary",
      content: ["```mermaid", "graph TD", "  A[Full]", "```"].join("\n"),
    });

    const bundle = buildPlaylistAssetsBundle({
      folder: {
        status: "resolved",
        playlistId: "testplaylistid0001",
        assetsFolderId: "testplaylistid0001",
        relativePath: "playlists/assets/testplaylistid0001",
        source: "record-match",
      },
      resolution: null,
      matches: [],
      loaded: [],
      clusterRows: [],
      clusterFiles: [],
    });

    const withFullMap = deduplicatePlaylistArtifactsForDisplay([
      ...bundle.artifacts,
      fullMap,
    ]);

    assert.equal(
      withFullMap.some((artifact) => artifact.id === "full-concept-map"),
      true,
    );
  });

  it("uses playlist-specific cache tags for layered assets", () => {
    const playlistId = "plwxnmb28xmpeypjmhfnbj4rafkrtman3p";

    assert.equal(
      lifeLabPlaylistClustersCacheTag(playlistId),
      "life-lab:playlist-clusters:plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
    );
    assert.equal(
      lifeLabPlaylistClusterCacheTag(playlistId, "mind-and-body"),
      "life-lab:playlist-cluster:plwxnmb28xmpeypjmhfnbj4rafkrtman3p:mind-and-body",
    );
    assert.equal(
      lifeLabPlaylistFullMapCacheTag(playlistId),
      "life-lab:playlist-full-map:plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
    );
    assert.notEqual(
      lifeLabPlaylistClustersCacheTag("playlist-a"),
      lifeLabPlaylistClustersCacheTag("playlist-b"),
    );
  });

  it("normalizes cluster slugs without broad title guessing", () => {
    assert.equal(normalizeClusterSlug("Mind and body"), "mind-and-body");
    assert.equal(normalizeClusterSlug("clusters/personal-identity.md"), "personal-identity");
  });

  it("treats missing cluster files as harmless", () => {
    const row = {
      slug: "missing-cluster",
      title: "Missing cluster",
      description: null,
      count: null,
      clusterPath: null,
    };

    assert.equal(resolveClusterFileForRow(row, []), null);
  });
});

describe("playlist asset registry", () => {
  it("includes layered Ava/OpenClaw asset filenames", () => {
    const filenames = PLAYLIST_ASSET_DEFINITIONS.map(
      (definition) => definition.filename,
    );

    assert.equal(filenames.includes("playlist-clusters.md"), true);
    assert.equal(filenames.includes("playlist-full-concept-map.md"), true);
    assert.equal(filenames.includes("playlist-learning-map.md"), true);
  });
});

describe("playlist cluster metadata", () => {
  it("avoids contradictory concept counts on one row", () => {
    const metadata = formatClusterRowMetadata({
      slug: "core-concepts",
      title: "Core concepts",
      description:
        "Existentialism, dialectic, values, memory, responsibility · 25 concepts",
      count: 5,
      clusterPath: null,
    });

    assert.equal(
      metadata.conceptsLine,
      "Existentialism, dialectic, values, memory, responsibility",
    );
    assert.equal(metadata.countLine, "25 concepts");
  });

  it("uses singular concept grammar", () => {
    const metadata = formatClusterRowMetadata({
      slug: "one",
      title: "One concept",
      description: "Existentialism",
      count: 1,
      clusterPath: null,
    });

    assert.equal(metadata.countLine, "1 concept");
  });
});
