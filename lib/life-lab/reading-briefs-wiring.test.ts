import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("reading briefs life-lab archive wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("section browser mounts dedicated Reading Briefs archive", () => {
    const browserSource = readFileSync(
      join(root, "components/life-lab/life-lab-section-browser.tsx"),
      "utf8",
    );

    assert.match(browserSource, /ReadingBriefsPageContent/);
    assert.match(browserSource, /sectionId === "reading-briefs"/);
    assert.match(browserSource, /sourceQuery=\{filters\.source/);
    assert.match(browserSource, /delete next\.source/);
  });

  it("archive page uses collection cards and collapsed reference", () => {
    const pageSource = readFileSync(
      join(root, "components/life-lab/reading-briefs-page-content.tsx"),
      "utf8",
    );
    const rowSource = readFileSync(
      join(root, "components/life-lab/reading-brief-row.tsx"),
      "utf8",
    );

    assert.match(pageSource, /data-reading-briefs-layout/);
    assert.match(pageSource, /archive-v2/);
    assert.match(pageSource, /Daily brief collections/);
    assert.match(pageSource, /LifeLabCollectionRow/);
    assert.match(pageSource, /Saved articles & essays/);
    assert.match(pageSource, /Reference & setup/);
    assert.match(pageSource, /Back to Reading Briefs/);
    assert.doesNotMatch(pageSource, /Latest brief/);
    assert.doesNotMatch(pageSource, /About & reference/);
    assert.match(
      pageSource,
      /<details[\s\S]*Reference & setup[\s\S]*<\/details>/,
    );

    const collectionsIdx = pageSource.indexOf("Daily brief collections");
    const savedIdx = pageSource.indexOf("Saved articles & essays");
    const referenceIdx = pageSource.indexOf(">Reference & setup");
    const debugPanelIdx = pageSource.indexOf("<DebugPanel");

    assert.ok(collectionsIdx > 0);
    assert.ok(savedIdx > collectionsIdx);
    assert.ok(referenceIdx > savedIdx);
    assert.ok(debugPanelIdx > referenceIdx);

    assert.match(rowSource, /<Link/);
    assert.doesNotMatch(rowSource, />\s*Open\s*</);
  });

  it("reading-briefs branch prefers archive over LifeLabSectionNotes", () => {
    const browserSource = readFileSync(
      join(root, "components/life-lab/life-lab-section-browser.tsx"),
      "utf8",
    );

    assert.match(
      browserSource,
      /sectionId === "reading-briefs" \? \([\s\S]*ReadingBriefsPageContent[\s\S]*\) : \([\s\S]*LifeLabSectionNotes/,
    );
  });
});
