import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPlaylistCloudContext,
  extractPresentersFromPlaylistTitle,
  filterPlaylistCloudItems,
} from "@/lib/life-lab/playlist-cloud-filter";
import { formatClusterRowMetadata } from "@/lib/life-lab/playlist-clusters";
import { preparePlaylistSummaryForDisplay } from "@/lib/life-lab/playlist-artifact-content";
import type { PlaylistAssetView } from "@/lib/life-lab/playlist-assets";

describe("playlist cloud context filtering", () => {
  it("excludes presenter names from the People cloud", () => {
    const result = filterPlaylistCloudItems({
      type: "people",
      playlistTitle: "Death with Shelly Kagan",
      items: [
        { label: "Shelly Kagan", count: 40 },
        { label: "Kagan", count: 12 },
        { label: "Plato", count: 8 },
        { label: "Descartes", count: 6 },
      ],
    });

    assert.equal(
      result.visibleItems.some((item) => item.label === "Shelly Kagan"),
      false,
    );
    assert.equal(result.visibleItems.some((item) => item.label === "Plato"), true);
    assert.equal(
      result.allItems.find((item) => item.label === "Shelly Kagan")?.rawCount,
      40,
    );
  });

  it("keeps a studied philosopher when the playlist is about them", () => {
    const presenters = extractPresentersFromPlaylistTitle(
      "The Philosophy of Shelly Kagan",
    );

    assert.deepEqual(presenters, []);

    const result = filterPlaylistCloudItems({
      type: "people",
      playlistTitle: "The Philosophy of Shelly Kagan",
      items: [{ label: "Shelly Kagan", count: 20 }],
    });

    assert.equal(result.visibleItems.length, 1);
  });

  it("hides the dominant playlist topic from the visible Concepts cloud", () => {
    const result = filterPlaylistCloudItems({
      type: "concepts",
      playlistTitle: "Death with Shelly Kagan",
      items: [
        { label: "death", count: 57 },
        { label: "deaths", count: 4 },
        { label: "mortality", count: 19 },
        { label: "personal identity", count: 14 },
        { label: "physicalism", count: 11 },
        { label: "dualism", count: 9 },
      ],
    });

    assert.equal(result.visibleItems.some((item) => item.label === "death"), false);
    assert.equal(
      result.visibleItems.some((item) => item.label === "mortality"),
      true,
    );
    assert.equal(
      result.allItems.find((item) => item.label === "death")?.rawCount,
      57,
    );
  });

  it("applies explicit cloud metadata overrides", () => {
    const context = buildPlaylistCloudContext({
      playlistTitle: "Western Philosophy",
      metadata: {
        presenters: ["Sample Lecturer"],
        cloudStopTerms: ["philosophy"],
        cloudBoostTerms: ["epistemology"],
      },
    });

    assert.deepEqual(context.presenters, ["Sample Lecturer"]);
    assert.ok(context.cloudStopTerms.includes("philosophy"));
    assert.ok(context.cloudBoostTerms.includes("epistemology"));
  });

  it("keeps exact counts available under View counts", () => {
    const result = filterPlaylistCloudItems({
      type: "concepts",
      playlistTitle: "Death with Shelly Kagan",
      items: [
        { label: "death", count: 57 },
        { label: "soul", count: 8 },
      ],
    });

    assert.equal(result.allItems.length, 2);
    assert.equal(result.visibleItems.length, 1);
    assert.equal(result.visibleItems[0]?.label, "soul");
  });
});

describe("playlist analysis deduplication helpers", () => {
  function asset(
    partial: Partial<PlaylistAssetView> & Pick<PlaylistAssetView, "id" | "content">,
  ): PlaylistAssetView {
    return {
      title: partial.title ?? partial.id,
      tier: partial.tier ?? "secondary",
      relativePath: partial.relativePath ?? `${partial.id}.md`,
      fileId: partial.fileId ?? `file-${partial.id}`,
      modifiedAt: null,
      unavailable: false,
      error: null,
      contentHash: partial.contentHash ?? partial.id,
      ...partial,
    };
  }

  it("strips duplicate Concepts and People sections from playlist summary", () => {
    const body = preparePlaylistSummaryForDisplay(
      asset({
        id: "summary",
        tier: "primary",
        content: [
          "## Playlist Summary",
          "Overview",
          "## Concepts",
          "- death — 57",
          "## People",
          "- Shelly Kagan — 40",
          "## Recent videos",
          "- One",
        ].join("\n"),
      }),
      new Set(["concept-frequencies", "people"]),
    );

    assert.doesNotMatch(body, /## Concepts/);
    assert.doesNotMatch(body, /## People/);
    assert.doesNotMatch(body, /Shelly Kagan — 40/);
    assert.match(body, /Overview/);
  });

  it("formats cluster rows as compact representative concepts", () => {
    const metadata = formatClusterRowMetadata({
      slug: "crisis-and-meaning",
      title: "Crisis and Meaning",
      description:
        "Mortality, immortality, deprivation, anxiety, meaning, hope · 6 related concepts",
      count: 6,
      clusterPath: null,
    });

    assert.equal(
      metadata.conceptsLine,
      "Mortality, immortality, deprivation, anxiety, meaning",
    );
    assert.equal(metadata.countLine, "6 concepts");
  });
});
