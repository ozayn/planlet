import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("learning dictionary life-lab render wiring", () => {
  const root = join(import.meta.dirname, "../..");

  it("life-lab learning-dictionary route mounts dedicated Browse/Learn page", () => {
    const sectionPage = readFileSync(
      join(root, "app/(app)/life-lab/[section]/page.tsx"),
      "utf8",
    );
    const dedicated = readFileSync(
      join(root, "components/life-lab/life-lab-learning-dictionary-page.tsx"),
      "utf8",
    );

    assert.match(sectionPage, /section === "learning-dictionary"/);
    assert.match(sectionPage, /LifeLabLearningDictionaryPage/);
    assert.match(dedicated, /data-learning-dictionary-view=\{activeView\}/);
    assert.match(dedicated, /DictionaryModeTabs/);
    assert.match(dedicated, /DictionaryLearnView/);
    assert.match(dedicated, /LifeLabSectionBrowser/);
    assert.match(dedicated, /data-life-lab-learning-dictionary-page/);
  });

  it("section browser still mounts dedicated Learning Dictionary browse renderer", () => {
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

  it("learning-dictionary browse branch prefers dedicated content over LifeLabSectionNotes", () => {
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

  it("Learn view reuses reveal controls and does not use the generic section-only path for the route", () => {
    const sectionPage = readFileSync(
      join(root, "app/(app)/life-lab/[section]/page.tsx"),
      "utf8",
    );
    const learn = readFileSync(
      join(root, "components/learning-dictionary/dictionary-learn-view.tsx"),
      "utf8",
    );

    // Early dedicated branch for learning-dictionary (before generic PageHeader flow).
    const dedicatedIndex = sectionPage.indexOf(
      'if (section === "learning-dictionary")',
    );
    const genericBrowserIndex = sectionPage.lastIndexOf("<LifeLabSectionBrowser");
    assert.ok(dedicatedIndex >= 0);
    assert.ok(genericBrowserIndex > dedicatedIndex);

    assert.match(learn, /Tap to reveal meaning/);
    assert.match(learn, /Reveal meaning/);
    assert.match(learn, /LearningStateControls/);
    assert.match(learn, /dir="auto"/);
    assert.match(learn, /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(learn, /browseHref/);
  });
});
