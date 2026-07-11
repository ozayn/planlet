import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  frequencyCloudStyle,
  parseFrequencyMarkdownList,
} from "@/lib/life-lab/frequency-cloud";

describe("frequency cloud", () => {
  it("parses concept and people frequency lists", () => {
    const items = parseFrequencyMarkdownList(
      ["- freedom — 12", "- faith — 10", "- Aristotle — 4"].join("\n"),
    );

    assert.equal(items[0]?.label, "freedom");
    assert.equal(items[0]?.count, 12);
    assert.equal(items[2]?.label, "Aristotle");
  });

  it("maps frequency deterministically to font size without rotation", () => {
    const low = frequencyCloudStyle(2, 2, 12);
    const high = frequencyCloudStyle(12, 2, 12);

    assert.notEqual(low.fontSize, high.fontSize);
    assert.ok(high.fontWeight >= low.fontWeight);
    assert.ok(high.opacity >= low.opacity);
    assert.equal("transform" in low, false);
  });

  it("uses one shared sizing function for concept and people clouds", () => {
    const concept = frequencyCloudStyle(8, 1, 10);
    const people = frequencyCloudStyle(8, 1, 10);

    assert.deepEqual(concept, people);
  });
});
