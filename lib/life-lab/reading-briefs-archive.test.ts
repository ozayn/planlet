import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  buildReadingBriefArchive,
  classifyReadingBriefNote,
  groupDailyBriefsBySource,
  normalizeReadingBriefSourceTitle,
  readingBriefSourceSlug,
  readingBriefReferenceDisplayTitle,
  resolveReadingBriefSourceLabel,
} from "@/lib/life-lab/reading-briefs-archive";

function note(
  partial: Partial<LifeLabNoteSummary> &
    Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  const relativePath =
    partial.relativePath ??
    (partial.slug.includes("__")
      ? `${partial.slug.split("__").join("/")}.md`
      : `${partial.slug}.md`);

  return {
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: null,
    fileId: partial.fileId ?? `file-${partial.slug}`,
    relativePath,
    ...partial,
  };
}

describe("classifyReadingBriefNote", () => {
  it("classifies daily/*.md as dailyBrief", () => {
    assert.equal(
      classifyReadingBriefNote(
        note({
          slug: "daily__2026-07-15-brief",
          title: "Bbc World Service",
          relativePath: "daily/2026-07-15-brief.md",
          subfolderLabel: "daily",
        }),
      ),
      "dailyBrief",
    );
  });

  it("classifies reading-briefs/daily/** as dailyBrief", () => {
    assert.equal(
      classifyReadingBriefNote(
        note({
          slug: "daily__2026-07-15",
          title: "Bbc World Service",
          relativePath: "reading-briefs/daily/2026-07-15.md",
        }),
      ),
      "dailyBrief",
    );
  });

  it("classifies saved-articles/*.md as savedArticle", () => {
    assert.equal(
      classifyReadingBriefNote(
        note({
          slug: "saved-articles__wikipedia-odyssey",
          title: "Wikipedia Odyssey",
          relativePath: "saved-articles/wikipedia-odyssey.md",
          subfolderLabel: "saved-articles",
        }),
      ),
      "savedArticle",
    );
  });

  it("classifies root Wikipedia Odyssey as savedArticle", () => {
    assert.equal(
      classifyReadingBriefNote(
        note({
          slug: "wikipedia-odyssey",
          title: "Wikipedia Odyssey",
          relativePath: "Wikipedia Odyssey.md",
        }),
      ),
      "savedArticle",
    );
  });

  it("classifies contentKind article as savedArticle", () => {
    assert.equal(
      classifyReadingBriefNote(
        note({
          slug: "odyssey",
          title: "Wikipedia Odyssey",
          relativePath: "notes/odyssey.md",
          metadata: { contentKind: "article" } as LifeLabNoteSummary["metadata"],
        }),
      ),
      "savedArticle",
    );
  });

  it("classifies README/sources/interests/workflow as reference", () => {
    for (const sample of [
      { slug: "README", title: "README", relativePath: "README.md" },
      { slug: "sources", title: "Sources", relativePath: "sources.md" },
      { slug: "interests", title: "Interests", relativePath: "interests.md" },
      {
        slug: "daily-bbc-world-service-workflow",
        title: "Daily BBC World Service Workflow",
        relativePath: "daily-bbc-world-service-workflow.md",
      },
    ]) {
      assert.equal(
        classifyReadingBriefNote(note(sample)),
        "reference",
        sample.relativePath,
      );
    }
  });
});

describe("normalizeReadingBriefSourceTitle", () => {
  it("normalizes BBC capitalization", () => {
    assert.equal(
      normalizeReadingBriefSourceTitle("Bbc World Service"),
      "BBC World Service",
    );
  });
});

describe("readingBriefReferenceDisplayTitle", () => {
  it("uses friendly reference titles", () => {
    assert.equal(
      readingBriefReferenceDisplayTitle(
        note({ slug: "README", title: "README", relativePath: "README.md" }),
      ),
      "How Reading Briefs works",
    );
  });
});

describe("daily brief source collections", () => {
  const bbcNotes = [
    note({
      slug: "daily__2026-07-15",
      title: "Bbc World Service",
      relativePath: "daily/2026-07-15.md",
      subfolderLabel: "daily",
      modifiedAt: "2026-07-15T12:00:00.000Z",
    }),
    note({
      slug: "daily__2026-07-14",
      title: "Bbc World Service",
      relativePath: "daily/2026-07-14.md",
      subfolderLabel: "daily",
      modifiedAt: "2026-07-14T12:00:00.000Z",
    }),
    note({
      slug: "daily__2026-07-13",
      title: "Bbc World Service",
      relativePath: "daily/2026-07-13.md",
      subfolderLabel: "daily",
      modifiedAt: "2026-07-13T12:00:00.000Z",
    }),
  ];

  const notes = [
    ...bbcNotes,
    note({
      slug: "daily__2026-07-12-guardian",
      title: "The Guardian",
      relativePath: "daily/2026-07-12-guardian.md",
      subfolderLabel: "daily",
      modifiedAt: "2026-07-12T12:00:00.000Z",
      metadata: { source: "The Guardian" },
    }),
    note({
      slug: "wikipedia-odyssey",
      title: "Wikipedia Odyssey",
      relativePath: "Wikipedia Odyssey.md",
      modifiedAt: "2026-07-14T12:00:00.000Z",
    }),
    note({
      slug: "README",
      title: "README",
      relativePath: "README.md",
    }),
    note({
      slug: "sources",
      title: "Sources",
      relativePath: "sources.md",
    }),
    note({
      slug: "interests",
      title: "Interests",
      relativePath: "interests.md",
    }),
    note({
      slug: "workflow",
      title: "Daily BBC World Service Workflow",
      relativePath: "daily-bbc-world-service-workflow.md",
    }),
  ];

  it("groups all BBC daily notes into one collection", () => {
    const collections = groupDailyBriefsBySource(bbcNotes);

    assert.equal(collections.length, 1);
    assert.equal(collections[0]?.sourceLabel, "BBC World Service");
    assert.equal(collections[0]?.count, 3);
    assert.equal(collections[0]?.sourceKey, "bbc-world-service");
  });

  it("puts newest BBC date on the collection card", () => {
    const collections = groupDailyBriefsBySource(bbcNotes);
    assert.equal(collections[0]?.latestNote.slug, "daily__2026-07-15");
    assert.match(collections[0]?.latestDateLabel ?? "", /Jul 15/);
  });

  it("does not repeat child BBC notes on the landing archive", () => {
    const archive = buildReadingBriefArchive(notes);

    assert.equal(archive.dailyCollections.length, 2);
    assert.deepEqual(
      archive.dailyCollections.map((item) => item.sourceLabel).sort(),
      ["BBC World Service", "The Guardian"],
    );
    assert.equal(
      archive.dailyCollections.find((item) => item.sourceKey === "bbc-world-service")
        ?.count,
      3,
    );
    // Landing model exposes collections, not flattened child rows.
    assert.equal(archive.activeCollection, null);
  });

  it("opens a BBC source filter to all BBC daily notes", () => {
    const archive = buildReadingBriefArchive(notes, {
      sourceFilter: "bbc-world-service",
    });

    assert.ok(archive.activeCollection);
    assert.equal(archive.activeCollection?.sourceLabel, "BBC World Service");
    assert.equal(archive.activeCollection?.notes.length, 3);
    assert.equal(archive.activeCollection?.notes[0]?.slug, "daily__2026-07-15");
    assert.equal(archive.dailyCollections.length, 0);
    assert.equal(archive.referenceNotes.length, 0);
    assert.equal(archive.savedArticles.length, 0);
  });

  it("keeps Wikipedia Odyssey in saved articles, not reference", () => {
    const archive = buildReadingBriefArchive(notes);

    assert.ok(
      archive.savedArticles.some((item) => item.title === "Wikipedia Odyssey"),
    );
    assert.ok(
      !archive.referenceNotes.some(
        (item) => item.title === "Wikipedia Odyssey",
      ),
    );
    assert.deepEqual(
      archive.referenceNotes.map((item) =>
        readingBriefReferenceDisplayTitle(item),
      ).sort(),
      [
        "Daily brief workflow",
        "How Reading Briefs works",
        "Interests",
        "Sources",
      ],
    );
  });

  it("keeps multiple sources as separate collection cards", () => {
    const archive = buildReadingBriefArchive(notes);
    assert.equal(archive.dailyCollections.length, 2);
    assert.ok(
      archive.dailyCollections.every((item) => item.count >= 1),
    );
  });

  it("preserves individual daily notes for search (flat dailyAll)", () => {
    const archive = buildReadingBriefArchive(notes);
    assert.equal(archive.dailyAll.length, 4);
    assert.ok(archive.dailyAll.every((item) => item.slug.startsWith("daily__")));
  });

  it("slugs BBC World Service for collection routes", () => {
    assert.equal(
      readingBriefSourceSlug("BBC World Service"),
      "bbc-world-service",
    );
    assert.equal(
      resolveReadingBriefSourceLabel(
        note({
          slug: "daily__x",
          title: "Bbc World Service",
          relativePath: "daily/x.md",
        }),
      ),
      "BBC World Service",
    );
  });
});
