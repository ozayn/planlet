import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("learning dictionary life-lab render wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("section browser mounts dedicated Learning Dictionary renderer", () => {
    const browserSource = readFileSync(
      join(root, "components/life-lab/life-lab-section-browser.tsx"),
      "utf8",
    );

    assert.match(browserSource, /LearningDictionaryPageContent/);
    assert.match(browserSource, /sectionId === "learning-dictionary"/);
    assert.match(
      browserSource,
      /sectionId === "learning-dictionary" \? \(\s*<LearningDictionaryPageContent/,
    );
  });

  it("dedicated page content exposes compact layout marker and ordered sections", () => {
    const pageSource = readFileSync(
      join(
        root,
        "components/life-lab/learning-dictionary-page-content.tsx",
      ),
      "utf8",
    );
    const layoutSource = readFileSync(
      join(root, "lib/life-lab/learning-dictionary-layout.ts"),
      "utf8",
    );
    const rowSource = readFileSync(
      join(root, "components/life-lab/learning-dictionary-entry-row.tsx"),
      "utf8",
    );
    const sectionSource = readFileSync(
      join(root, "components/life-lab/learning-dictionary-section.tsx"),
      "utf8",
    );

    assert.match(layoutSource, /data-learning-dictionary-layout/);
    assert.match(layoutSource, /compact-v1/);
    assert.match(pageSource, /learningDictionaryLayoutMarker/);
    assert.match(pageSource, /orderLearningDictionaryGroups/);
    assert.match(pageSource, /Debug/);
    assert.match(rowSource, /dir="auto"/);
    assert.match(rowSource, /<Link/);
    assert.doesNotMatch(sectionSource, /CategoryBadge/);
    assert.doesNotMatch(sectionSource, /LifeLabNoteCardMeta/);
    assert.doesNotMatch(sectionSource, /StudyStatusBadge/);
  });

  it("learning-dictionary branch prefers dedicated content over LifeLabSectionNotes", () => {
    const browserSource = readFileSync(
      join(root, "components/life-lab/life-lab-section-browser.tsx"),
      "utf8",
    );
    const branchMatch = browserSource.match(
      /sectionId === "learning-dictionary" \? \([\s\S]*?\) : \([\s\S]*?LifeLabSectionNotes/,
    );

    assert.ok(branchMatch);
    assert.match(branchMatch![0], /LearningDictionaryPageContent/);
  });
});
