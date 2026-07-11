import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  buildLifeLabSectionView,
  formatPlaylistCardProgress,
  type LifeLabPlaylistCard,
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

  it("builds playlist cards from collection folders with cleaned titles", () => {
    const notes = [
      noteSummary({
        slug: "playlists__death-with-shelly-kagan-index",
        title: "Death With Shelly Kagan Index",
        subfolderLabel: "playlists",
        relativePath: "playlists/death-with-shelly-kagan-index.md",
        excerpt: "26 processed · 0 pending · 0 errors",
        metadata: {
          type: "playlist-index",
          playlist: "Death with Shelly Kagan",
        },
        dateLabel: "Jul 10, 2026",
      }),
      ...Array.from({ length: 26 }, (_, index) =>
        noteSummary({
          slug: `death-with-shelly-kagan__lesson-${index + 1}`,
          title: `Lesson ${index + 1}`,
          subfolderLabel: "death-with-shelly-kagan",
          relativePath: `death-with-shelly-kagan/lesson-${index + 1}.md`,
          metadata: {
            playlist: "Death with Shelly Kagan",
            youtube_thumbnail: {
              url: "https://i.ytimg.com/vi/lessonthumb/hqdefault.jpg",
            },
          },
        }),
      ),
    ];

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
    });

    const playlistBlock = view.blocks.find((block) => block.kind === "playlists");

    assert.equal(playlistBlock?.kind, "playlists");
    assert.equal(playlistBlock?.items[0]?.title, "Death with Shelly Kagan");
    assert.equal(playlistBlock?.items[0]?.noteCount, 26);
    assert.equal(
      playlistBlock?.items[0]?.thumbnail?.url,
      "https://i.ytimg.com/vi/lessonthumb/hqdefault.jpg",
    );
    assert.match(playlistBlock?.items[0]?.href ?? "", /death-with-shelly-kagan-index/);
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
      noteSummary({
        slug: "videos__public-playlist-1",
        title: "Public video",
        subfolderLabel: "videos",
        relativePath: "videos/public-playlist-1.md",
        metadata: { playlist: "Public Playlist", source: "youtube" },
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
        metadata: { channel: `Channel ${index % 2 === 0 ? "A" : "B"}` },
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
    assert.equal(recentBlock?.notes.length, 5);

    assert.equal(standaloneBlock?.kind, "standalone-videos");
    assert.equal(standaloneBlock?.totalCount, 6);
    assert.ok(standaloneBlock.channelGroups.length >= 1);
    assert.ok(
      standaloneBlock.channelGroups.some((group) => group.previewNotes.length > 0),
    );
  });

  it("excludes playlist artifacts from browse playlist cards", () => {
    const notes = [
      noteSummary({
        slug: "playlists__assets__sample__playlist-learning-map",
        title: "Playlist Learning Map",
        subfolderLabel: "playlists",
        relativePath:
          "playlists/assets/sample-playlist/playlist-learning-map.md",
      }),
      noteSummary({
        slug: "playlists__assets__sample__people-index",
        title: "People",
        subfolderLabel: "playlists",
        relativePath: "playlists/assets/sample-playlist/people-index.md",
      }),
      noteSummary({
        slug: "playlists__valid-playlist",
        title: "Valid Playlist",
        subfolderLabel: "playlists",
        relativePath: "playlists/valid-playlist.md",
        metadata: {
          type: "playlist-index",
          playlist: "Valid Playlist",
        },
      }),
      noteSummary({
        slug: "valid-playlist__lesson-1",
        title: "Lesson 1",
        subfolderLabel: "valid-playlist",
        relativePath: "valid-playlist/lesson-1.md",
        metadata: { playlist: "Valid Playlist", source: "youtube" },
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
    assert.equal(playlistBlock?.items[0]?.title, "Valid Playlist");
  });

  it("shows partially resolved playlist indexes as cards and records debug", () => {
    const notes = [
      noteSummary({
        slug: "playlists__broken-index",
        title: "Broken Playlist Index",
        subfolderLabel: "playlists",
        relativePath: "playlists/broken-index.md",
        excerpt: "12 processed · 2 pending · 0 errors",
        metadata: {
          type: "playlist-index",
          playlist: "Broken Playlist",
        },
        dateLabel: "Jul 8, 2026",
      }),
    ];

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
    });

    const playlistBlock = view.blocks.find((block) => block.kind === "playlists");
    const unresolvedBlock = view.blocks.find(
      (block) => block.kind === "unresolved-playlists",
    );

    assert.equal(playlistBlock?.kind, "playlists");
    assert.equal(playlistBlock?.items.length, 1);
    assert.equal(playlistBlock?.items[0]?.resolutionState, "partiallyResolved");
    assert.equal(playlistBlock?.items[0]?.noteCount, 12);
    assert.equal(unresolvedBlock?.kind, "unresolved-playlists");
    assert.equal(unresolvedBlock?.items.length, 1);
    assert.equal(unresolvedBlock?.items[0]?.title, "Broken Playlist");
  });

  it("does not expose debug fields on production playlist cards", () => {
    const card: LifeLabPlaylistCard = {
      slug: "playlists__sample",
      title: "Sample",
      noteCount: 3,
      notesLabel: "3 notes",
      channelLabel: null,
      resolutionState: "resolved",
      lastUpdatedLabel: "Jul 8, 2026",
      progressSummary: null,
      href: "/life-lab/youtube-learning/playlists__sample",
      thumbnail: null,
    };

    assert.equal("dev" in card, false);
    assert.equal("unavailableLabel" in card, false);
    assert.ok(card.href.length > 0);
  });

  it("dedupes duplicate notes by file id when building browse pools", () => {
    const duplicate = noteSummary({
      slug: "videos__duplicate",
      title: "Duplicate",
      subfolderLabel: "videos",
      relativePath: "videos/duplicate.md",
      fileId: "same-file-id",
      dateLabel: "Jul 10, 2026",
    });
    const duplicateAlias = {
      ...duplicate,
      slug: "videos__duplicate-alias",
      relativePath: "videos/duplicate-alias.md",
    };

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: [duplicate, duplicateAlias],
      groups: [],
      hasActiveQuery: false,
    });

    const recentBlock = view.blocks.find((block) => block.kind === "recently-added");

    assert.equal(recentBlock?.kind, "recently-added");
    assert.equal(recentBlock?.notes.length, 1);
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
