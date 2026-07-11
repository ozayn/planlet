import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collapsedArtifactLabel,
  countMarkdownEntries,
  deduplicatePlaylistArtifactsForDisplay,
  deduplicateTimelineMarkdown,
  prepareArtifactBodyForDisplay,
  suppressDuplicatePlaylistIndexContent,
} from "@/lib/life-lab/playlist-artifact-content";
import type { PlaylistAssetView } from "@/lib/life-lab/playlist-assets";
import { formatPlaylistHeaderLine, formatPlaylistHeaderState } from "@/lib/life-lab/playlist-index";

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

describe("playlist artifact content", () => {
  it("strips embedded learning map sections from playlist summary when a dedicated map exists", () => {
    const learningMap = asset({
      id: "learning-map",
      tier: "primary",
      content: ["# Learning Map", "", "```mermaid", "graph TD", "  A[Map]", "```"].join(
        "\n",
      ),
      contentHash: "map",
    });
    const summary = asset({
      id: "summary",
      tier: "primary",
      content: [
        "# Playlist Summary",
        "",
        "## Learning Map",
        "",
        "```mermaid",
        "graph TD",
        "  A[Duplicate]",
        "```",
        "",
        "## Overview",
        "",
        "A concise overview.",
      ].join("\n"),
      contentHash: "summary",
    });

    const prepared = deduplicatePlaylistArtifactsForDisplay([
      learningMap,
      summary,
    ]);
    const preparedSummary = prepared.find((artifact) => artifact.id === "summary");

    assert.equal(preparedSummary?.id, "summary");
    assert.doesNotMatch(preparedSummary?.content ?? "", /```mermaid/);
    assert.match(preparedSummary?.content ?? "", /A concise overview/);
  });

  it("removes recent videos and questions sections from summary content", () => {
    const summary = asset({
      id: "summary",
      tier: "primary",
      content: [
        "## Overview",
        "",
        "Main summary text.",
        "",
        "## Recent videos",
        "",
        "- Episode 1",
        "",
        "## Questions",
        "",
        "- What is justice?",
      ].join("\n"),
    });

    const [prepared] = deduplicatePlaylistArtifactsForDisplay([summary]);

    assert.match(prepared?.content ?? "", /Main summary text/);
    assert.doesNotMatch(prepared?.content ?? "", /Recent videos/i);
    assert.doesNotMatch(prepared?.content ?? "", /Questions/i);
  });

  it("deduplicates timeline timestamp lines", () => {
    const input = [
      "## Timeline",
      "",
      "Course introduction",
      "- 00:00 Opening",
      "- 00:00 Opening",
      "- 06:38 Lecture start",
    ].join("\n");

    const output = deduplicateTimelineMarkdown(input);

    assert.equal((output.match(/00:00 Opening/g) ?? []).length, 1);
    assert.match(output, /06:38 Lecture start/);
  });

  it("deduplicates repeated timeline sections and preserves markdown emphasis", () => {
    const input = [
      "## Aristotle",
      "- **384 BCE** — Aristotle is born in *Macedonia*.",
      "",
      "## Aristotle",
      "- **384 BCE** — Aristotle is born in *Macedonia*.",
      "- **Student of Plato** — He studies at Plato's Academy.",
    ].join("\n");

    const output = deduplicateTimelineMarkdown(input);

    assert.equal((output.match(/## Aristotle/g) ?? []).length, 1);
    assert.match(output, /\*\*384 BCE\*\*/);
    assert.match(output, /\*Macedonia\*/);
    assert.match(output, /\*\*Student of Plato\*\*/);
  });

  it("suppresses duplicate sections from the playlist index body", () => {
    const indexBody = [
      "## Learning Map",
      "",
      "```mermaid",
      "graph TD",
      "  A --> B",
      "```",
      "",
      "## Concepts",
      "",
      "- soul",
      "",
      "## Videos",
      "",
      "| status | title |",
    ].join("\n");

    const { body, suppressedDuplicates } = suppressDuplicatePlaylistIndexContent({
      indexBody,
      assets: [
        asset({
          id: "learning-map",
          tier: "primary",
          content: "map",
          contentHash: "map",
        }),
        asset({
          id: "concept-frequencies",
          content: "- soul",
          contentHash: "concepts",
        }),
      ],
    });

    assert.ok(suppressedDuplicates.includes("index-learning-map"));
    assert.ok(suppressedDuplicates.includes("index-concept-frequencies"));
    assert.doesNotMatch(body, /```mermaid/);
    assert.match(body, /## Videos/);
  });

  it("formats collapsed artifact labels with counts", () => {
    const label = collapsedArtifactLabel(
      asset({
        id: "concept-frequencies",
        content: "- one\n- two\n- three",
      }),
    );

    assert.equal(label, "Concepts · 3");
    assert.equal(countMarkdownEntries("- alpha\n- beta"), 2);
  });

  it("strips redundant headings from dedicated artifact bodies", () => {
    const body = prepareArtifactBodyForDisplay(
      asset({
        id: "learning-map",
        tier: "primary",
        title: "Death with Shelly Kagan — Learning Map",
        content: [
          "## Death with Shelly Kagan — Learning Map",
          "",
          "```mermaid",
          "graph TD",
          "  A[Topic]",
          "```",
        ].join("\n"),
      }),
    );

    assert.doesNotMatch(body, /Death with Shelly Kagan/);
    assert.match(body, /```mermaid/);
  });
});

describe("playlist page layout helpers", () => {
  it("formats playlist header metadata without repeated status prose", () => {
    assert.equal(
      formatPlaylistHeaderLine({
        channel: "The School of Life",
        visibleCount: 33,
        dateLabel: "Jul 11",
      }),
      "The School of Life · 33 videos · Updated Jul 11",
    );
    assert.equal(
      formatPlaylistHeaderState({
        summary: {
          total: 33,
          processed: 33,
          pending: 0,
          skipped: 0,
          error: 0,
        },
        hiddenUnavailableCount: 1,
      }),
      "33 processed · 1 unavailable",
    );
  });
});
