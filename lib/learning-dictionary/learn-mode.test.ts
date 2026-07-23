import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildDictionaryLearnSession,
  summarizeDictionarySessionResults,
  type DictionaryLearnItem,
} from "@/lib/learning-dictionary/learn-session";
import {
  dictionaryStudyStatusLabel,
  mapDriveStudyStatusToDictionary,
  nextDictionaryStudyStatus,
  resolveDictionaryStudyStatus,
} from "@/lib/learning-dictionary/study-state";

function item(
  partial: Partial<DictionaryLearnItem> &
    Pick<DictionaryLearnItem, "itemKey" | "title">,
): DictionaryLearnItem {
  return {
    slug: partial.slug ?? partial.itemKey,
    definition: partial.definition ?? `Meaning of ${partial.title}`,
    href: partial.href ?? `/learning-dictionary/${partial.itemKey}`,
    studyStatus: partial.studyStatus ?? "new",
    ...partial,
  };
}

describe("dictionary study state", () => {
  it("maps Drive statuses onto Learn statuses", () => {
    assert.equal(mapDriveStudyStatusToDictionary("studying"), "learning");
    assert.equal(mapDriveStudyStatusToDictionary("learned"), "known");
    assert.equal(mapDriveStudyStatusToDictionary("revisit"), "revisit");
    assert.equal(mapDriveStudyStatusToDictionary("new"), "new");
  });

  it("prefers per-user status over Drive metadata", () => {
    assert.equal(
      resolveDictionaryStudyStatus({
        userStatus: "known",
        driveStatus: "new",
      }),
      "known",
    );
    assert.equal(
      resolveDictionaryStudyStatus({
        userStatus: null,
        driveStatus: "studying",
      }),
      "learning",
    );
  });

  it("maps learn actions to persisted statuses", () => {
    assert.equal(nextDictionaryStudyStatus("not-yet"), "learning");
    assert.equal(nextDictionaryStudyStatus("learning"), "learning");
    assert.equal(nextDictionaryStudyStatus("know"), "known");
    assert.equal(nextDictionaryStudyStatus("revisit"), "revisit");
    assert.equal(nextDictionaryStudyStatus("reset"), "new");
    assert.equal(dictionaryStudyStatusLabel("learning"), "Learning");
  });
});

describe("dictionary learn session", () => {
  it("prioritizes revisit, then learning, then new", () => {
    const session = buildDictionaryLearnSession(
      [
        item({ itemKey: "known", title: "Known", studyStatus: "known" }),
        item({ itemKey: "new", title: "New", studyStatus: "new" }),
        item({ itemKey: "learn", title: "Learning", studyStatus: "learning" }),
        item({ itemKey: "revisit", title: "Revisit", studyStatus: "revisit" }),
      ],
      { size: 10 },
    );

    assert.deepEqual(
      session.map((entry) => entry.itemKey),
      ["revisit", "learn", "new"],
    );
  });

  it("excludes known items by default and supports known-only review", () => {
    const items = [
      item({ itemKey: "a", title: "A", studyStatus: "known" }),
      item({ itemKey: "b", title: "B", studyStatus: "new" }),
    ];

    assert.equal(buildDictionaryLearnSession(items, { size: 10 }).length, 1);
    assert.equal(
      buildDictionaryLearnSession(items, { size: 10, knownOnly: true })[0]
        ?.itemKey,
      "a",
    );
  });

  it("respects session size and avoids duplicate keys", () => {
    const items = [
      item({ itemKey: "1", title: "One", studyStatus: "revisit" }),
      item({ itemKey: "1", title: "One duplicate", studyStatus: "new" }),
      item({ itemKey: "2", title: "Two", studyStatus: "learning" }),
      item({ itemKey: "3", title: "Three", studyStatus: "new" }),
      item({ itemKey: "4", title: "Four", studyStatus: "new" }),
    ];

    const session = buildDictionaryLearnSession(items, { size: 3 });
    assert.equal(session.length, 3);
    assert.equal(new Set(session.map((entry) => entry.itemKey)).size, 3);
  });

  it("summarizes session results without scoring pressure", () => {
    const summary = summarizeDictionarySessionResults([
      "known",
      "learning",
      "revisit",
      "known",
    ]);
    assert.equal(summary.total, 4);
    assert.equal(summary.known, 2);
    assert.equal(summary.learning, 2);
  });
});

describe("dictionary learn UI wiring", () => {
  const root = join(import.meta.dirname, "../..");
  const page = readFileSync(
    join(root, "app/(app)/learning-dictionary/page.tsx"),
    "utf8",
  );
  const learn = readFileSync(
    join(root, "components/learning-dictionary/dictionary-learn-view.tsx"),
    "utf8",
  );
  const browser = readFileSync(
    join(root, "components/learning-dictionary/learning-dictionary-browser.tsx"),
    "utf8",
  );
  const card = readFileSync(
    join(root, "components/learning-dictionary/learning-dictionary-card.tsx"),
    "utf8",
  );
  const actions = readFileSync(
    join(root, "app/(app)/learning-dictionary/study-actions.ts"),
    "utf8",
  );

  it("keeps Browse available and adds Learn mode", () => {
    assert.match(page, /DictionaryModeTabs/);
    assert.match(page, /LearningDictionaryBrowser/);
    assert.match(page, /DictionaryLearnView/);
    assert.match(page, /view === "learn"/);
  });

  it("shows one term at a time with reveal before meaning", () => {
    assert.match(learn, /Tap to reveal meaning/);
    assert.match(learn, /Reveal meaning/);
    assert.match(learn, /data-dictionary-explore-card/);
    assert.match(learn, /LearningStateControls/);
    assert.match(learn, /SessionProgress/);
    assert.match(learn, /FlashcardReadAloudControls/);
    assert.match(learn, /dir="auto"/);
    assert.match(learn, /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  });

  it("persists study state in Planlet actions without Drive writes", () => {
    assert.match(actions, /setLifeLabItemStudyStatus/);
    assert.match(actions, /dictionary-entry/);
    assert.doesNotMatch(actions, /drive\.files\.update|updateFileContent/);
  });

  it("uses quiet browse status indicators and status filters", () => {
    assert.match(browser, /DICTIONARY_STATUS_CHIPS/);
    assert.match(browser, /studyStatusByKey/);
    assert.match(card, /STATUS_DOT_CLASS/);
    assert.match(card, /sr-only/);
  });
});
