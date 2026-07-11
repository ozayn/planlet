import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  formatCollectionDisplayTitle,
  getCollectionNoteCount,
  isCollectionContentNote,
  isCollectionExcludedFilename,
  isCollectionIndexFilename,
  listCollectionContentNotes,
  normalizeCollectionSlug,
  resolveCollection,
  stripIndexTitleSuffix,
} from "@/lib/life-lab/collection";

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

function buildCollectionNotes(folder: string, count: number, playlist?: string) {
  return Array.from({ length: count }, (_, index) =>
    noteSummary({
      slug: `${folder.replace(/\//g, "__")}__lesson-${index + 1}`,
      title: `Lesson ${index + 1}`,
      subfolderLabel: folder.split("/")[0] ?? folder,
      relativePath: `${folder}/lesson-${index + 1}.md`,
      metadata: playlist ? { playlist } : undefined,
    }),
  );
}

describe("life lab collections", () => {
  it("detects collection index filenames", () => {
    assert.equal(isCollectionIndexFilename("index.md"), true);
    assert.equal(isCollectionIndexFilename("death-with-shelly-kagan-index.md"), true);
    assert.equal(isCollectionIndexFilename("playlist-index.md"), true);
    assert.equal(isCollectionIndexFilename("collection-index.md"), true);
    assert.equal(isCollectionIndexFilename("lesson-1.md"), false);
  });

  it("excludes metadata filenames from collection counts", () => {
    assert.equal(isCollectionExcludedFilename("README.md"), true);
    assert.equal(isCollectionExcludedFilename("channels.md"), true);
    assert.equal(isCollectionExcludedFilename("renaissance-index.md"), true);
    assert.equal(isCollectionExcludedFilename("episode-1.md"), false);
  });

  it("strips Index suffix from display titles", () => {
    assert.equal(
      stripIndexTitleSuffix("Death With Shelly Kagan Index"),
      "Death With Shelly Kagan",
    );
    assert.equal(formatCollectionDisplayTitle({ title: "Renaissance Index" }), "Renaissance");
    assert.equal(
      formatCollectionDisplayTitle({
        title: "Western Philosophy Index",
        metadata: { playlist: "Western Philosophy" },
      }),
      "Western Philosophy",
    );
  });

  it("counts notes recursively under a sibling collection folder", () => {
    const index = noteSummary({
      slug: "playlists__death-with-shelly-kagan-index",
      title: "Death With Shelly Kagan Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/death-with-shelly-kagan-index.md",
      metadata: {
        type: "playlist-index",
        playlist: "Death with Shelly Kagan",
      },
    });
    const notes = [
      index,
      ...buildCollectionNotes("death-with-shelly-kagan", 26, "Death with Shelly Kagan"),
      noteSummary({
        slug: "death-with-shelly-kagan__nested__extra",
        title: "Extra",
        relativePath: "death-with-shelly-kagan/nested/extra.md",
        subfolderLabel: "death-with-shelly-kagan",
      }),
    ];

    assert.equal(getCollectionNoteCount(index, notes), 27);
    assert.equal(
      resolveCollection(index, notes).resolutionSource,
      "sibling-folder",
    );
  });

  it("counts justice and iranian revolution collections", () => {
    const justiceIndex = noteSummary({
      slug: "playlists__justice-with-michael-sandel-index",
      title: "Justice With Michael Sandel Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/justice-with-michael-sandel-index.md",
      metadata: {
        type: "playlist-index",
        playlist: "Justice with Michael Sandel",
      },
    });
    const iranianIndex = noteSummary({
      slug: "playlists__the-iranian-revolution-index",
      title: "The Iranian Revolution Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/the-iranian-revolution-index.md",
      metadata: {
        type: "playlist-index",
        playlist: "The Iranian Revolution",
      },
    });
    const notes = [
      justiceIndex,
      iranianIndex,
      ...buildCollectionNotes("justice-with-michael-sandel", 19),
      ...buildCollectionNotes("the-iranian-revolution", 3),
    ];

    assert.equal(getCollectionNoteCount(justiceIndex, notes), 19);
    assert.equal(getCollectionNoteCount(iranianIndex, notes), 3);
  });

  it("counts great art explained and new index-based collections", () => {
    const greatArtIndex = noteSummary({
      slug: "playlists__great-art-explained-index",
      title: "Great Art Explained Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/great-art-explained-index.md",
      metadata: {
        type: "playlist-index",
        playlist: "Great Art Explained",
      },
    });
    const renaissanceIndex = noteSummary({
      slug: "renaissance__renaissance-index",
      title: "Renaissance Index",
      subfolderLabel: "renaissance",
      relativePath: "renaissance/renaissance-index.md",
      metadata: { type: "playlist-index" },
    });
    const westernPhilosophyIndex = noteSummary({
      slug: "playlists__western-philosophy-index",
      title: "Western Philosophy Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/western-philosophy-index.md",
      metadata: { type: "playlist-index" },
    });
    const artHistoryIndex = noteSummary({
      slug: "playlists__art-history-by-country-index",
      title: "Art History by Country Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/art-history-by-country-index.md",
      metadata: {
        type: "playlist-index",
        collectionPath: "art-history-by-country",
      },
    });
    const notes = [
      greatArtIndex,
      renaissanceIndex,
      westernPhilosophyIndex,
      artHistoryIndex,
      ...buildCollectionNotes("great-art-explained", 34),
      ...buildCollectionNotes("renaissance", 8),
      ...buildCollectionNotes("western-philosophy", 12),
      ...buildCollectionNotes("art-history-by-country", 5),
      noteSummary({
        slug: "great-art-explained__channels",
        title: "Channels",
        relativePath: "great-art-explained/channels.md",
        subfolderLabel: "great-art-explained",
      }),
    ];

    assert.equal(getCollectionNoteCount(greatArtIndex, notes), 34);
    assert.equal(getCollectionNoteCount(renaissanceIndex, notes), 8);
    assert.equal(getCollectionNoteCount(westernPhilosophyIndex, notes), 12);
    assert.equal(getCollectionNoteCount(artHistoryIndex, notes), 5);
    assert.equal(
      resolveCollection(artHistoryIndex, notes).resolutionSource,
      "frontmatter-collectionPath",
    );
  });

  it("falls back to playlist metadata for legacy videos folders", () => {
    const index = noteSummary({
      slug: "playlists__the-iranian-revolution",
      title: "The Iranian Revolution",
      subfolderLabel: "playlists",
      relativePath: "playlists/the-iranian-revolution.md",
      metadata: {
        type: "playlist-index",
        playlist: "The Iranian Revolution",
      },
    });
    const notes = [
      index,
      ...Array.from({ length: 3 }, (_, index) =>
        noteSummary({
          slug: `videos__episode-${index + 1}`,
          title: `Episode ${index + 1}`,
          subfolderLabel: "videos",
          relativePath: `videos/episode-${index + 1}.md`,
          metadata: {
            playlist: "The Iranian Revolution",
            source: "youtube",
          },
        }),
      ),
    ];

    assert.equal(getCollectionNoteCount(index, notes), 3);
    assert.equal(
      resolveCollection(index, notes).resolutionSource,
      "playlist-metadata",
    );
  });

  it("does not count the index file or archive notes", () => {
    const index = noteSummary({
      slug: "renaissance__index",
      title: "Renaissance Index",
      relativePath: "renaissance/index.md",
      subfolderLabel: "renaissance",
      metadata: { type: "playlist-index" },
    });
    const notes = [
      index,
      noteSummary({
        slug: "renaissance__study-1",
        title: "Study 1",
        relativePath: "renaissance/study-1.md",
        subfolderLabel: "renaissance",
      }),
      noteSummary({
        slug: "archive__old-note",
        title: "Old",
        relativePath: "archive/old-note.md",
        subfolderLabel: "archive",
      }),
    ];

    assert.equal(listCollectionContentNotes(index, notes).length, 1);
    assert.equal(isCollectionContentNote(index, index), false);
    assert.equal(
      isCollectionContentNote(notes[2]!, index),
      false,
    );
  });

  it("marks unresolved collections with zero content notes", () => {
    const index = noteSummary({
      slug: "playlists__missing-collection-index",
      title: "Missing Collection Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/missing-collection-index.md",
      metadata: { type: "playlist-index" },
    });

    const resolution = resolveCollection(index, [index]);

    assert.equal(resolution.resolved, false);
    assert.equal(resolution.contentNotes.length, 0);
    assert.equal(normalizeCollectionSlug("Death With Shelly Kagan Index"), "death-with-shelly-kagan");
  });
});
