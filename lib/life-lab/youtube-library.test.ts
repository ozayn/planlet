import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  classifyYoutubeLibraryNote,
  hasRecognizedPlaylist,
  isStandaloneYoutubeVideo,
  noteLibraryDedupeKey,
} from "@/lib/life-lab/youtube-library";

function noteSummary(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  return {
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: null,
    fileId: partial.fileId ?? `file-${partial.slug}`,
    relativePath: partial.relativePath ?? `${partial.slug}.md`,
    ...partial,
  };
}

describe("life lab youtube library classification", () => {
  it("classifies playable videos without a recognized playlist as standalone", () => {
    const note = noteSummary({
      slug: "videos__soul",
      title: "Soul",
      subfolderLabel: "videos",
      relativePath: "videos/soul.md",
    });

    assert.equal(classifyYoutubeLibraryNote(note), "standalone-video");
    assert.equal(isStandaloneYoutubeVideo(note), true);
    assert.equal(hasRecognizedPlaylist(note), false);
  });

  it("classifies playlist videos separately from standalone videos", () => {
    const note = noteSummary({
      slug: "videos__lesson-1",
      title: "Lesson 1",
      subfolderLabel: "videos",
      relativePath: "videos/lesson-1.md",
      metadata: { playlist: "Death with Shelly Kagan" },
    });

    assert.equal(classifyYoutubeLibraryNote(note), "playlist-video");
    assert.equal(isStandaloneYoutubeVideo(note), false);
  });

  it("treats metadata-only files as reference", () => {
    const note = noteSummary({
      slug: "channels",
      title: "Channels",
      relativePath: "channels.md",
    });

    assert.equal(classifyYoutubeLibraryNote(note), "reference");
  });

  it("dedupes notes by file id or relative path", () => {
    const note = noteSummary({
      slug: "videos__soul",
      title: "Soul",
      fileId: "abc123",
      relativePath: "videos/soul.md",
    });

    assert.equal(noteLibraryDedupeKey(note), "abc123");

    const fallback = noteSummary({
      slug: "videos__soul",
      title: "Soul",
      fileId: "",
      relativePath: "videos/soul.md",
    });

    assert.equal(noteLibraryDedupeKey(fallback), "videos/soul.md");
  });
});
