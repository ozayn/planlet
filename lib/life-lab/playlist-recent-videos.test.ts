import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import type { PlaylistVideoRow } from "@/lib/life-lab/playlist-index";
import {
  resolveRecentVideoHref,
  resolveRecentVideosFromMarkdown,
} from "@/lib/life-lab/playlist-recent-videos";

function note(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  return {
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: "videos",
    fileId: partial.fileId ?? `file-${partial.slug}`,
    relativePath: partial.relativePath ?? `videos/${partial.slug}.md`,
    ...partial,
  };
}

function video(partial: Partial<PlaylistVideoRow> & Pick<PlaylistVideoRow, "title">): PlaylistVideoRow {
  return {
    episode: null,
    status: "processed",
    duration: null,
    videoUrl: null,
    noteFilename: null,
    noteSlug: null,
    noteHref: null,
    ...partial,
  };
}

describe("playlist recent videos", () => {
  it("resolves recent video links by title and omits unresolved items", () => {
    const content = [
      "## Recent videos",
      "",
      "- Michel Foucault",
      "- Unknown lecture",
    ].join("\n");

    const resolved = resolveRecentVideosFromMarkdown({
      content,
      sectionId: "youtube-learning",
      videos: [
        video({
          title: "Michel Foucault",
          noteSlug: "western-philosophy__foucault",
          noteHref: "/life-lab/youtube-learning/western-philosophy__foucault",
        }),
      ],
      notes: [
        note({
          slug: "western-philosophy__foucault",
          title: "Michel Foucault",
        }),
      ],
      totalVisibleVideos: 10,
    });

    assert.equal(resolved.length, 1);
    assert.equal(resolved[0]?.href, "/life-lab/youtube-learning/western-philosophy__foucault");
  });

  it("omits recent videos when every entry would repeat the full list", () => {
    const content = ["## Recent videos", "", "- One", "- Two", "- Three"].join("\n");
    const resolved = resolveRecentVideosFromMarkdown({
      content,
      sectionId: "youtube-learning",
      videos: [
        video({
          title: "One",
          noteSlug: "videos__one",
          noteHref: "/life-lab/youtube-learning/videos__one",
        }),
        video({
          title: "Two",
          noteSlug: "videos__two",
          noteHref: "/life-lab/youtube-learning/videos__two",
        }),
        video({
          title: "Three",
          noteSlug: "videos__three",
          noteHref: "/life-lab/youtube-learning/videos__three",
        }),
      ],
      notes: [],
      totalVisibleVideos: 3,
    });

    assert.equal(resolved.length, 0);
  });

  it("resolves links by youtube video id when present in the title", () => {
    const href = resolveRecentVideoHref("Clip dQw4w9WgXcQ overview", {
      sectionId: "youtube-learning",
      videos: [],
      notes: [
        note({
          slug: "videos__clip",
          title: "Clip overview",
          metadata: { youtube_video_id: "dQw4w9WgXcQ" },
        }),
      ],
    });

    assert.equal(href, "/life-lab/youtube-learning/videos__clip");
  });
});
