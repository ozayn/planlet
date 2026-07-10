import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  buildLifeLabSectionView,
  formatPlaylistCardProgress,
} from "@/lib/life-lab/section-view";

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

function buildPlaylistVideoNotes(count: number, playlist: string) {
  return Array.from({ length: count }, (_, index) =>
    noteSummary({
      slug: `videos__lesson-${index + 1}`,
      title: `Lesson ${index + 1}`,
      subfolderLabel: "videos",
      relativePath: `videos/lesson-${index + 1}.md`,
      metadata: { playlist },
      dateLabel: "Jul 8, 2026",
    }),
  );
}

describe("life lab section view", () => {
  it("formats playlist progress summaries for cards", () => {
    assert.equal(
      formatPlaylistCardProgress("26 processed · 0 pending · 0 errors"),
      "Processed 26 · Pending 0",
    );
  });

  it("builds a calm youtube browse view with playlists and collapsed reference", () => {
    const playlistVideos = buildPlaylistVideoNotes(2, "Death with Shelly Kagan");
    playlistVideos[0] = {
      ...playlistVideos[0],
      metadata: {
        ...playlistVideos[0].metadata,
        study_status: "studying",
      },
    };
    const notes = [
      noteSummary({
        slug: "playlists__death-with-shelly-kagan",
        title: "Death with Shelly Kagan",
        subfolderLabel: "playlists",
        relativePath: "playlists/death-with-shelly-kagan.md",
        excerpt: "0 processed · 19 pending · 0 errors",
        metadata: {
          type: "playlist-index",
          playlist: "Death with Shelly Kagan",
          study_status: "studying",
        },
        dateLabel: "Jul 10, 2026",
      }),
      ...playlistVideos,
      noteSummary({
        slug: "channels",
        title: "Channels",
        relativePath: "channels.md",
      }),
      noteSummary({
        slug: "readme",
        title: "Readme",
        relativePath: "README.md",
      }),
    ];

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [
        {
          id: "playlist:death with shelly kagan",
          label: "Death with Shelly Kagan",
          notes: playlistVideos,
          collapsedByDefault: false,
          variant: "primary",
        },
        {
          id: "videos",
          label: "Videos",
          notes: playlistVideos,
          collapsedByDefault: false,
          variant: "primary",
        },
        {
          id: "reference",
          label: "Reference",
          notes: [notes[3]],
          collapsedByDefault: true,
          variant: "disclosure",
        },
        {
          id: "about",
          label: "About YouTube Learning",
          notes: [notes[4]],
          collapsedByDefault: true,
          variant: "disclosure",
        },
      ],
      hasActiveQuery: false,
    });

    assert.equal(view.mode, "browse");
    assert.equal(view.blocks[0]?.kind, "recently-added");
    assert.equal(view.blocks.some((block) => block.kind === "playlists"), true);

    const playlistBlock = view.blocks.find((block) => block.kind === "playlists");

    assert.equal(playlistBlock?.kind, "playlists");
    assert.equal(playlistBlock?.items[0]?.noteCount, 2);
    assert.equal(
      playlistBlock?.items[0]?.progressSummary,
      "Processed 0 · Pending 19",
    );

    assert.equal(
      view.blocks.some(
        (block) =>
          block.kind === "group" &&
          block.group.label === "Death with Shelly Kagan",
      ),
      false,
    );
    assert.equal(
      view.blocks.some(
        (block) => block.kind === "group" && block.group.id === "videos",
      ),
      false,
    );
    assert.equal(
      view.blocks.some(
        (block) => block.kind === "group" && block.group.label === "Reference",
      ),
      true,
    );
  });

  it("hides internal playlists from browse cards", () => {
    const notes = [
      noteSummary({
        slug: "playlists__processing",
        title: "YouTube Playlist Processing",
        subfolderLabel: "playlists",
        relativePath: "playlists/processing.md",
        excerpt: "5 processed · 0 pending · 0 errors",
        metadata: {
          type: "playlist-index",
          playlist: "YouTube Playlist Processing",
        },
      }),
      noteSummary({
        slug: "playlists__public-playlist",
        title: "Public Playlist",
        subfolderLabel: "playlists",
        relativePath: "playlists/public-playlist.md",
        excerpt: "3 processed · 0 pending · 0 errors",
        metadata: {
          type: "playlist-index",
          playlist: "Public Playlist",
        },
      }),
    ];

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
    });

    const playlistBlock = view.blocks.find((block) => block.kind === "playlists");

    assert.equal(playlistBlock?.kind, "playlists");
    assert.equal(playlistBlock?.items.length, 1);
    assert.equal(playlistBlock?.items[0]?.title, "Public Playlist");
  });

  it("shows standalone videos and avoids duplicating recently added previews", () => {
    const standaloneVideos = Array.from({ length: 6 }, (_, index) =>
      noteSummary({
        slug: `videos__standalone-${index + 1}`,
        title: `Standalone ${index + 1}`,
        subfolderLabel: "videos",
        relativePath: `videos/standalone-${index + 1}.md`,
        dateLabel: `Jul ${10 - index}, 2026`,
      }),
    );

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: standaloneVideos,
      groups: [
        {
          id: "standalone",
          label: "Standalone",
          notes: standaloneVideos,
          collapsedByDefault: false,
          variant: "primary",
        },
      ],
      hasActiveQuery: false,
    });

    const recentBlock = view.blocks.find((block) => block.kind === "recently-added");
    const standaloneBlock = view.blocks.find(
      (block) => block.kind === "standalone-videos",
    );

    assert.equal(recentBlock?.kind, "recently-added");
    assert.equal(recentBlock?.notes.length, 3);

    assert.equal(standaloneBlock?.kind, "standalone-videos");
    assert.equal(standaloneBlock?.totalCount, 6);
    assert.equal(standaloneBlock?.previewNotes.length, 3);

    const recentSlugs = new Set(
      recentBlock?.kind === "recently-added"
        ? recentBlock.notes.map((note) => note.slug)
        : [],
    );

    for (const note of standaloneBlock?.kind === "standalone-videos"
      ? standaloneBlock.previewNotes
      : []) {
      assert.equal(recentSlugs.has(note.slug), false);
    }
  });

  it("returns grouped search results when a query is active", () => {
    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: [],
      groups: [
        {
          id: "videos",
          label: "Videos",
          notes: [],
          collapsedByDefault: false,
          variant: "primary",
        },
      ],
      hasActiveQuery: true,
    });

    assert.equal(view.mode, "results");
    assert.equal(view.blocks[0]?.kind, "group");
  });
});
