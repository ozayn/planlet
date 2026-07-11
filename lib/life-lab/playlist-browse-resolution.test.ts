import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  isValidPlaylistBrowseIndex,
  parsePlaylistIndexNoteCountFromExcerpt,
  resolvePlaylistBrowseState,
} from "@/lib/life-lab/playlist-browse-resolution";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";

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

describe("playlist browse resolution", () => {
  it("parses processed counts from playlist index excerpts", () => {
    assert.equal(
      parsePlaylistIndexNoteCountFromExcerpt("26 processed · 0 pending · 0 errors"),
      26,
    );
    assert.equal(parsePlaylistIndexNoteCountFromExcerpt(""), null);
  });

  it("marks resolved playlists when child notes are found", () => {
    const index = noteSummary({
      slug: "playlists__valid-playlist",
      title: "Valid Playlist",
      subfolderLabel: "playlists",
      relativePath: "playlists/valid-playlist.md",
      metadata: {
        type: "playlist-index",
        playlist: "Valid Playlist",
      },
    });
    const notes = [
      index,
      noteSummary({
        slug: "valid-playlist__lesson-1",
        title: "Lesson 1",
        subfolderLabel: "valid-playlist",
        relativePath: "valid-playlist/lesson-1.md",
        metadata: { playlist: "Valid Playlist", source: "youtube" },
      }),
    ];

    const resolution = resolvePlaylistBrowseState({
      sectionId: "youtube-learning",
      indexNote: index,
      allNotes: notes,
    });

    assert.equal(resolution.state, "resolved");
    assert.equal(resolution.noteCount, 1);
  });

  it("keeps valid playlist indexes visible when folders are unresolved", () => {
    const index = noteSummary({
      slug: "playlists__death-with-shelly-kagan-index",
      title: "Death With Shelly Kagan Index",
      subfolderLabel: "playlists",
      relativePath: "playlists/death-with-shelly-kagan-index.md",
      excerpt: "26 processed · 0 pending · 0 errors",
      metadata: {
        type: "playlist-index",
        playlist: "Death with Shelly Kagan",
        channel: "YaleCourses",
      },
      dateLabel: "Jul 8, 2026",
    });

    const resolution = resolvePlaylistBrowseState({
      sectionId: "youtube-learning",
      indexNote: index,
      allNotes: [index],
    });

    assert.equal(resolution.state, "partiallyResolved");
    assert.equal(resolution.noteCount, 26);

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: [index],
      groups: [],
      hasActiveQuery: false,
    });

    const playlistBlock = view.blocks.find((block) => block.kind === "playlists");

    assert.equal(playlistBlock?.kind, "playlists");
    assert.equal(playlistBlock?.items.length, 1);
    assert.equal(playlistBlock?.items[0]?.title, "Death with Shelly Kagan");
    assert.equal(playlistBlock?.items[0]?.resolutionState, "partiallyResolved");
    assert.equal(playlistBlock?.items[0]?.noteCount, 26);
    assert.equal(playlistBlock?.items[0]?.channelLabel, "YaleCourses");
  });

  it("rejects playlist artifact files as browse indexes", () => {
    const artifact = noteSummary({
      slug: "playlists__assets__sample__playlist-learning-map",
      title: "Playlist Learning Map",
      relativePath:
        "playlists/assets/sample-playlist/playlist-learning-map.md",
    });

    assert.equal(
      isValidPlaylistBrowseIndex("youtube-learning", artifact),
      false,
    );
  });
});
