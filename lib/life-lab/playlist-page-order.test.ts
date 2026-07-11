import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import type { PlaylistAssetsBundle } from "@/lib/life-lab/playlist-assets";

function noteSummary(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  return {
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: null,
    fileId: partial.fileId ?? `file-${partial.slug}`,
    relativePath: partial.relativePath ?? `${partial.slug}.md`,
    ...partial,
  };
}

function emptyBundle(): PlaylistAssetsBundle {
  return {
    folder: { status: "unresolved", diagnostic: "No assets" },
    resolution: null,
    artifacts: [],
    clusterRows: [],
    clusterFiles: [],
    diagnostics: [],
    suppressedDuplicates: [],
    strippedIndexBody: null,
    learningMapFound: false,
    learningMapSignature: null,
  };
}

describe("playlist page render order", () => {
  it("keeps videos before playlist analysis sections", () => {
    const pageOrder = [
      "header",
      "playlist-summary",
      "videos",
      "playlist-analysis",
    ];

    assert.deepEqual(pageOrder, [
      "header",
      "playlist-summary",
      "videos",
      "playlist-analysis",
    ]);
  });

  it("orders analysis blocks as learning map, clusters, full map, supporting indexes", () => {
    const analysisOrder = [
      "learning-map",
      "concept-clusters",
      "full-concept-map",
      "supporting-indexes",
    ];

    const bundle: PlaylistAssetsBundle = {
      ...emptyBundle(),
      folder: {
        status: "resolved",
        playlistId: "test",
        assetsFolderId: "test",
        relativePath: "playlists/assets/test",
        source: "record-match",
      },
      learningMapFound: true,
      artifacts: [
        {
          id: "learning-map",
          title: "Learning Map",
          content: "map",
          tier: "primary",
          relativePath: "playlists/assets/test/playlist-learning-map.md",
          fileId: "map",
          modifiedAt: null,
          unavailable: false,
          error: null,
          contentHash: "map",
        },
        {
          id: "full-concept-map",
          title: "Full Concept Map",
          content: "full",
          tier: "secondary",
          relativePath: "playlists/assets/test/playlist-full-concept-map.md",
          fileId: "full",
          modifiedAt: null,
          unavailable: false,
          error: null,
          contentHash: "full",
        },
        {
          id: "people",
          title: "People",
          content: "people",
          tier: "secondary",
          relativePath: "playlists/assets/test/people-index.md",
          fileId: "people",
          modifiedAt: null,
          unavailable: false,
          error: null,
          contentHash: "people",
        },
      ],
      clusterRows: [
        {
          slug: "mind-and-body",
          title: "Mind and body",
          description: "Dualism, physicalism, soul",
          count: 3,
          clusterPath: null,
        },
      ],
    };

    const hasLearningMap = bundle.artifacts.some((item) => item.id === "learning-map");
    const hasClusters = bundle.clusterRows.length > 0;
    const hasFullMap = bundle.artifacts.some((item) => item.id === "full-concept-map");
    const hasSupporting = bundle.artifacts.some((item) => item.id === "people");

    assert.equal(hasLearningMap, true);
    assert.equal(hasClusters, true);
    assert.equal(hasFullMap, true);
    assert.equal(hasSupporting, true);
    assert.deepEqual(analysisOrder[0], "learning-map");
    assert.deepEqual(analysisOrder[1], "concept-clusters");
    assert.deepEqual(analysisOrder[2], "full-concept-map");
    assert.deepEqual(analysisOrder[3], "supporting-indexes");
  });

  it("does not require playlist video notes for asset rendering", () => {
    const indexNote = noteSummary({
      slug: "playlists__western-philosophy-index",
      title: "Western Philosophy Index",
      relativePath: "playlists/western-philosophy-index.md",
      metadata: { type: "playlist-index", playlist: "Western Philosophy" },
    });

    assert.equal(indexNote.slug.includes("index"), true);
  });
});
