import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  driveFilenameToSlug,
  driveRelativePathToSlug,
  formatDateLabelFromFilename,
  isReadmeRelativePath,
  isReadmeSlug,
  markdownExcerpt,
  parseDateFromFilename,
  relativePathSubfolder,
  slugToRelativePath,
  slugToTitle,
  titleFromFilename,
} from "@/lib/life-lab/slug";
import { groupDisclosureSummary, groupLifeLabNotes } from "@/lib/life-lab/organization";
import {
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
  sectionIdFromFolderName,
} from "@/lib/life-lab/sections";
import { isLifeLabDevToolsEnabled } from "@/lib/life-lab/dev";
import { isMarkdownDriveFile } from "@/lib/life-lab/google-drive";
import {
  lifeLabFolderEntriesToMap,
  normalizeLifeLabFolderMapResult,
  resolveLifeLabFolderMap,
} from "@/lib/life-lab";
import { canUseLifeLabFeatures, canAccessLifeLabPage } from "@/lib/roles";
import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";

function noteSummary(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
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

describe("life lab folder map handling", () => {
  it("reconstructs a Map from cached entries", () => {
    const folderMap = lifeLabFolderEntriesToMap([
      ["youtube-learning", "folder-1"],
      ["photography", "folder-2"],
    ]);

    assert.equal(folderMap.get("youtube-learning"), "folder-1");
    assert.equal(folderMap.get("photography"), "folder-2");
  });

  it("normalizes successful cache payloads", () => {
    const result = normalizeLifeLabFolderMapResult({
      ok: true,
      entries: [["art-history", "folder-3"]],
    });

    assert.equal(result?.ok, true);
    assert.deepEqual(
      resolveLifeLabFolderMap(result)?.get("art-history"),
      "folder-3",
    );
  });

  it("normalizes failed cache payloads without throwing", () => {
    const result = normalizeLifeLabFolderMapResult({
      ok: false,
      error: {
        name: "LifeLabDriveError",
        message: "Google Drive request failed (404).",
      },
    });

    assert.equal(result?.ok, false);
    assert.equal(resolveLifeLabFolderMap(result), null);
  });

  it("rejects invalid cache payloads", () => {
    assert.equal(normalizeLifeLabFolderMapResult(undefined), null);
    assert.equal(normalizeLifeLabFolderMapResult({ ok: true }), null);
    assert.equal(normalizeLifeLabFolderMapResult({}), null);
  });
});

describe("life lab access", () => {
  it("allows Personal users and admins", () => {
    assert.equal(canUseLifeLabFeatures({ role: "PERSONAL" }), true);
    assert.equal(canUseLifeLabFeatures({ role: "ADMIN" }), true);
    assert.equal(canUseLifeLabFeatures({ role: "USER" }), false);
    assert.equal(canUseLifeLabFeatures({ role: "REFLECTOR" }), false);
    assert.equal(
      canUseLifeLabFeatures({
        role: "USER",
        canUseLifeLabFeatures: true,
      }),
      false,
    );
  });

  it("keeps route access aligned with feature access", () => {
    assert.equal(canAccessLifeLabPage({ role: "PERSONAL" }), true);
    assert.equal(canAccessLifeLabPage({ role: "ADMIN" }), true);
    assert.equal(canAccessLifeLabPage({ role: "USER" }), false);
    assert.equal(canAccessLifeLabPage({ role: "REFLECTOR" }), false);
  });
});

describe("life lab sections", () => {
  it("allows only configured public sections", () => {
    assert.equal(isLifeLabSectionId("youtube-learning"), true);
    assert.equal(isLifeLabSectionId("photography"), true);
    assert.equal(isLifeLabSectionId("therapy-prep"), false);
  });

  it("blocks private section ids explicitly", () => {
    assert.equal(isLifeLabSectionBlocked("therapy-prep"), true);
    assert.equal(isLifeLabSectionBlocked("health-notes"), true);
    assert.equal(isLifeLabSectionBlocked("youtube-learning"), false);
  });

  it("maps allowed folder names to section ids", () => {
    assert.equal(sectionIdFromFolderName("art-history"), "art-history");
    assert.equal(sectionIdFromFolderName("therapy-prep"), null);
  });
});

describe("life lab slug helpers", () => {
  it("converts markdown filenames to slugs", () => {
    assert.equal(
      driveFilenameToSlug("2026-07-02 Renaissance Notes.md"),
      "2026-07-02-renaissance-notes",
    );
  });

  it("converts nested relative paths to reversible slugs", () => {
    assert.equal(
      driveRelativePathToSlug("videos/2026-07-04-bplus-bush-gulf-war.md"),
      "videos__2026-07-04-bplus-bush-gulf-war",
    );
    assert.equal(
      slugToRelativePath("videos__2026-07-04-bplus-bush-gulf-war"),
      "videos/2026-07-04-bplus-bush-gulf-war.md",
    );
    assert.equal(
      driveRelativePathToSlug(
        "videos/2026-07-05-rest-is-history-benjamin-franklin.md",
      ),
      "videos__2026-07-05-rest-is-history-benjamin-franklin",
    );
  });

  it("extracts subfolder labels from relative paths", () => {
    assert.equal(
      relativePathSubfolder("videos/2026-07-04-bplus-bush-gulf-war.md"),
      "videos",
    );
    assert.equal(relativePathSubfolder("README.md"), null);
  });

  it("detects README notes", () => {
    assert.equal(isReadmeRelativePath("README.md"), true);
    assert.equal(isReadmeSlug("readme"), true);
    assert.equal(isReadmeSlug("videos__2026-07-04-bplus-bush-gulf-war"), false);
  });

  it("derives titles without date prefixes", () => {
    assert.equal(slugToTitle("renaissance-notes"), "Renaissance Notes");
    assert.equal(
      titleFromFilename("2026-07-04-bplus-bush-gulf-war.md"),
      "Bplus Bush Gulf War",
    );
    assert.equal(
      slugToTitle("videos__2026-07-04-bplus-bush-gulf-war"),
      "Bplus Bush Gulf War",
    );
    assert.equal(titleFromFilename("channels.md"), "Channels");
  });

  it("formats date labels from filenames", () => {
    assert.equal(
      formatDateLabelFromFilename("2026-07-04-bplus-bush-gulf-war.md"),
      "Jul 4, 2026",
    );
  });

  it("parses date prefixes from filenames", () => {
    assert.equal(
      parseDateFromFilename("2026-07-02-note.md"),
      "2026-07-02",
    );
  });

  it("creates short markdown excerpts", () => {
    assert.equal(
      markdownExcerpt("# Heading\n\nA **short** note about art."),
      "Heading A short note about art.",
    );
  });
});

describe("life lab note organization", () => {
  it("groups video notes first with collapsed reference and about sections", () => {
    const groups = groupLifeLabNotes([
      noteSummary({
        slug: "readme",
        title: "Readme",
        relativePath: "README.md",
      }),
      noteSummary({
        slug: "channels",
        title: "Channels",
        relativePath: "channels.md",
      }),
      noteSummary({
        slug: "videos__2026-07-05-rest-is-history-benjamin-franklin",
        title: "Rest Is History Benjamin Franklin",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-05-rest-is-history-benjamin-franklin.md",
        dateLabel: "Jul 5, 2026",
      }),
      noteSummary({
        slug: "videos__2026-07-04-bplus-bush-gulf-war",
        title: "Bplus Bush Gulf War",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-04-bplus-bush-gulf-war.md",
        dateLabel: "Jul 4, 2026",
      }),
      noteSummary({
        slug: "concepts",
        title: "Concepts",
        relativePath: "concepts.md",
      }),
      noteSummary({
        slug: "questions",
        title: "Questions",
        relativePath: "questions.md",
      }),
    ]);

    assert.deepEqual(
      groups.map((group) => group.label),
      ["Videos", "Reference", "About this section"],
    );
    assert.equal(groups[0]?.variant, "primary");
    assert.equal(groups[0]?.collapsedByDefault, false);
    assert.equal(groups[1]?.variant, "disclosure");
    assert.equal(groups[1]?.collapsedByDefault, true);
    assert.equal(groups[2]?.label, "About this section");
    assert.deepEqual(
      groups[0]?.notes.map((note) => note.title),
      [
        "Rest Is History Benjamin Franklin",
        "Bplus Bush Gulf War",
      ],
    );
    assert.deepEqual(
      groups[1]?.notes.map((note) => note.title),
      ["Channels", "Concepts", "Questions"],
    );
  });

  it("dedupes duplicate file ids using videos over archive priority", () => {
    const groups = groupLifeLabNotes([
      noteSummary({
        slug: "archive__2026-07-04-bplus-bush-gulf-war",
        title: "Archived copy",
        subfolderLabel: "archive",
        fileId: "shared-file",
        relativePath: "archive/2026-07-04-bplus-bush-gulf-war.md",
      }),
      noteSummary({
        slug: "videos__2026-07-04-bplus-bush-gulf-war",
        title: "Bplus Bush Gulf War",
        subfolderLabel: "videos",
        fileId: "shared-file",
        relativePath: "videos/2026-07-04-bplus-bush-gulf-war.md",
      }),
    ]);

    assert.deepEqual(groups.map((group) => group.label), ["Videos"]);
    assert.equal(groups[0]?.notes.length, 1);
    assert.equal(groups[0]?.notes[0]?.title, "Bplus Bush Gulf War");
  });

  it("formats disclosure summaries with note counts", () => {
    assert.equal(
      groupDisclosureSummary({
        id: "reference",
        label: "Reference",
        notes: [
          noteSummary({ slug: "channels", title: "Channels" }),
          noteSummary({ slug: "concepts", title: "Concepts" }),
          noteSummary({ slug: "questions", title: "Questions" }),
        ],
        collapsedByDefault: true,
        variant: "disclosure",
      }),
      "Reference · 3 notes",
    );
  });
});

describe("life lab dev tools", () => {
  it("enables dev tools only in development", () => {
    assert.equal(isLifeLabDevToolsEnabled(), process.env.NODE_ENV === "development");
  });
});

describe("life lab markdown file filter", () => {
  it("accepts markdown and plain text files ending in .md", () => {
    assert.equal(
      isMarkdownDriveFile({
        id: "1",
        name: "note.md",
        mimeType: "text/markdown",
      }),
      true,
    );
    assert.equal(
      isMarkdownDriveFile({
        id: "2",
        name: "note.md",
        mimeType: "text/plain",
      }),
      true,
    );
  });

  it("rejects non-markdown files", () => {
    assert.equal(
      isMarkdownDriveFile({
        id: "3",
        name: "sheet.pdf",
        mimeType: "application/pdf",
      }),
      false,
    );
  });
});
