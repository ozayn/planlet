import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  driveFilenameToSlug,
  markdownExcerpt,
  parseDateFromFilename,
  slugToTitle,
} from "@/lib/life-lab/slug";
import {
  isLifeLabSectionBlocked,
  isLifeLabSectionId,
  sectionIdFromFolderName,
} from "@/lib/life-lab/sections";
import { isMarkdownDriveFile } from "@/lib/life-lab/google-drive";
import {
  lifeLabFolderEntriesToMap,
  normalizeLifeLabFolderMapResult,
  resolveLifeLabFolderMap,
} from "@/lib/life-lab";
import { canUseLifeLabFeatures, canAccessLifeLabPage } from "@/lib/roles";

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

  it("derives titles from slugs", () => {
    assert.equal(slugToTitle("renaissance-notes"), "Renaissance Notes");
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
