import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  frequencyCloudStyle,
  limitFrequencyCloudItems,
  mergeFrequencyCloudItems,
  parseFrequencyMarkdownList,
} from "@/lib/life-lab/frequency-cloud";
import { prepareArtifactBodyForDisplay } from "@/lib/life-lab/playlist-artifact-content";
import type { PlaylistAssetView } from "@/lib/life-lab/playlist-assets";

describe("frequency cloud parsing", () => {
  it("parses em-dash bullet concept frequency lines", () => {
    const items = parseFrequencyMarkdownList(
      ["- freedom — 12", "- faith — 10", "- existentialism — 9"].join("\n"),
    );

    assert.equal(items[0]?.label, "freedom");
    assert.equal(items[0]?.count, 12);
    assert.equal(items[2]?.label, "existentialism");
  });

  it("parses colon bullet people frequency lines", () => {
    const items = parseFrequencyMarkdownList(
      ["- Aristotle: 8", "- Plato: 6"].join("\n"),
    );

    assert.equal(items[0]?.label, "Aristotle");
    assert.equal(items[0]?.count, 8);
  });

  it("parses plain and numbered frequency lines", () => {
    const items = parseFrequencyMarkdownList(
      [
        "freedom — 12",
        "faith — 10",
        "1. existentialism — 9",
        "2. virtue — 7",
      ].join("\n"),
    );

    assert.deepEqual(
      items.map((item) => item.label),
      ["freedom", "faith", "existentialism", "virtue"],
    );
  });

  it("parses markdown table frequency rows", () => {
    const items = parseFrequencyMarkdownList(
      [
        "| Concept | Count |",
        "| --- | --- |",
        "| freedom | 12 |",
        "| faith | 10 |",
      ].join("\n"),
    );

    assert.deepEqual(items, [
      { label: "freedom", count: 12 },
      { label: "faith", count: 10 },
    ]);
  });

  it("merges duplicate labels case-insensitively", () => {
    const merged = mergeFrequencyCloudItems([
      { label: "Freedom", count: 4 },
      { label: "freedom", count: 12 },
      { label: "FAITH", count: 3 },
      { label: "faith", count: 10 },
    ]);

    assert.deepEqual(merged, [
      { label: "freedom", count: 16 },
      { label: "faith", count: 13 },
    ]);
  });

  it("discards invalid counts and technical headings", () => {
    const items = parseFrequencyMarkdownList(
      [
        "# Concepts",
        "- freedom — 0",
        "-  — 4",
        "- count — 3",
        "- courage — 5",
      ].join("\n"),
    );

    assert.deepEqual(items, [{ label: "courage", count: 5 }]);
  });

  it("returns an empty list when no valid frequency data exists", () => {
    assert.deepEqual(parseFrequencyMarkdownList("# Concepts\n\nNo data yet."), []);
  });
});

describe("frequency cloud scaling", () => {
  it("gives the highest count the largest font size", () => {
    const low = frequencyCloudStyle(2, 2, 20, {
      minFontSize: 14,
      maxFontSize: 30,
    });
    const high = frequencyCloudStyle(20, 2, 20, {
      minFontSize: 14,
      maxFontSize: 30,
    });

    assert.ok(Number.parseFloat(high.fontSize) > Number.parseFloat(low.fontSize));
    assert.ok(high.fontWeight >= low.fontWeight);
  });

  it("renders equal counts at the same size", () => {
    const first = frequencyCloudStyle(8, 8, 8, {
      minFontSize: 14,
      maxFontSize: 30,
    });
    const second = frequencyCloudStyle(8, 8, 8, {
      minFontSize: 14,
      maxFontSize: 30,
    });

    assert.deepEqual(first, second);
  });

  it("uses square-root scaling instead of linear domination", () => {
    const dominant = frequencyCloudStyle(100, 1, 100, {
      minFontSize: 14,
      maxFontSize: 30,
    });
    const mid = frequencyCloudStyle(25, 1, 100, {
      minFontSize: 14,
      maxFontSize: 30,
    });

    const dominantSize = Number.parseFloat(dominant.fontSize);
    const midSize = Number.parseFloat(mid.fontSize);

    assert.ok(midSize > 14);
    assert.ok(dominantSize - midSize < 10);
  });

  it("uses one shared sizing function for concept and people clouds", () => {
    const concept = frequencyCloudStyle(8, 1, 10, {
      minFontSize: 14,
      maxFontSize: 30,
    });
    const people = frequencyCloudStyle(8, 1, 10, {
      minFontSize: 14,
      maxFontSize: 26,
    });

    assert.equal(concept.fontWeight, people.fontWeight);
    assert.equal("transform" in concept, false);
  });
});

describe("playlist frequency display", () => {
  function asset(
    partial: Partial<PlaylistAssetView> & Pick<PlaylistAssetView, "id" | "content">,
  ): PlaylistAssetView {
    return {
      title: partial.title ?? "Concepts",
      tier: partial.tier ?? "secondary",
      relativePath: partial.relativePath ?? "playlists/assets/test/concept-frequencies.md",
      fileId: partial.fileId ?? "file-1",
      modifiedAt: null,
      unavailable: false,
      error: null,
      contentHash: "hash",
      ...partial,
    };
  }

  it("parses concept asset bodies after heading cleanup", () => {
    const items = limitFrequencyCloudItems(
      parseFrequencyMarkdownList(
        prepareArtifactBodyForDisplay(
          asset({
            id: "concept-frequencies",
            content: [
              "# Concept Frequencies",
              "",
              "freedom — 12",
              "faith — 10",
            ].join("\n"),
          }),
        ),
      ),
      24,
    );

    assert.equal(items.length, 2);
    assert.equal(items[0]?.label, "freedom");
  });

  it("caps concept clouds at 24 items", () => {
    const lines = Array.from({ length: 30 }, (_, index) => `term-${index} — ${30 - index}`);
    const items = limitFrequencyCloudItems(
      parseFrequencyMarkdownList(lines.join("\n")),
      24,
    );

    assert.equal(items.length, 24);
  });

  it("keeps exact counts available for collapsed disclosure", () => {
    const items = parseFrequencyMarkdownList("- freedom — 12\n- faith — 10");

    assert.deepEqual(items, [
      { label: "freedom", count: 12 },
      { label: "faith", count: 10 },
    ]);
  });
});
