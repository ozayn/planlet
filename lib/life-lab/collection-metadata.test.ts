import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  formatChannelCollectionMetadata,
  formatCount,
  formatPlaylistCardProgress,
  formatPlaylistCollectionMetadata,
  formatSeriesCollectionMetadata,
  LIFE_LAB_COLLECTION_ROW_LINK_ROLE,
  normalizeAccidentalAllCapsTitle,
} from "@/lib/life-lab/collection-metadata";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";

function noteSummary(
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

describe("life lab collection metadata", () => {
  it("formats singular and plural video counts", () => {
    assert.equal(formatCount(1, "video", "videos"), "1 video");
    assert.equal(formatCount(2, "video", "videos"), "2 videos");
  });

  it("formats singular and plural note counts", () => {
    assert.equal(formatCount(1, "note", "notes"), "1 note");
    assert.equal(formatCount(2, "note", "notes"), "2 notes");
  });

  it("formats channel collection metadata as one compact row", () => {
    const metadata = formatChannelCollectionMetadata({
      totalCount: 3,
      notes: [
        noteSummary({
          slug: "videos__bplus-1",
          title: "Episode 1",
          dateLabel: "Jul 8, 2026",
        }),
      ],
    });

    assert.equal(metadata.primaryMeta, "3 videos");
    assert.equal(metadata.secondaryMeta, "Updated Jul 8, 2026");
  });

  it("formats series metadata with channel and updated date", () => {
    const metadata = formatSeriesCollectionMetadata({
      channel: "BBC Persian",
      videos: [noteSummary({ slug: "a" }), noteSummary({ slug: "b" })],
      lastUpdatedLabel: "Jul 8",
    });

    assert.equal(metadata.primaryMeta, "BBC Persian · 2 videos");
    assert.equal(metadata.secondaryMeta, "Updated Jul 8");
  });

  it("hides zero values in playlist progress metadata", () => {
    assert.equal(
      formatPlaylistCardProgress("26 processed · 0 pending · 0 errors"),
      null,
    );
    assert.equal(
      formatPlaylistCardProgress("0 processed · 9 pending · 0 errors"),
      "9 pending",
    );
  });

  it("shows compact processed and pending counts only when pending exists", () => {
    assert.equal(
      formatPlaylistCardProgress("3 processed · 9 pending · 0 errors"),
      "3 processed · 9 pending",
    );
  });

  it("omits redundant processed count for fully processed playlists", () => {
    const metadata = formatPlaylistCollectionMetadata({
      channelLabel: "YaleCourses",
      noteCount: 26,
      progressSummary: null,
      lastUpdatedLabel: "Jul 8",
    });

    assert.equal(metadata.primaryMeta, "YaleCourses · 26 notes");
    assert.equal(metadata.secondaryMeta, "Updated Jul 8");
    assert.equal(metadata.secondaryMeta?.includes("processed"), false);
  });

  it("shows pending processing on a secondary line for incomplete playlists", () => {
    const metadata = formatPlaylistCollectionMetadata({
      channelLabel: "Dr. Roy Casagranda",
      noteCount: 3,
      progressSummary: "3 processed · 9 pending",
      lastUpdatedLabel: "Jul 5",
    });

    assert.equal(metadata.primaryMeta, "Dr. Roy Casagranda · 3 notes");
    assert.equal(metadata.secondaryMeta, "3 processed · 9 pending");
    assert.equal(metadata.secondaryMeta?.includes("Updated"), false);
  });

  it("normalizes accidental all-caps latin titles", () => {
    assert.equal(
      normalizeAccidentalAllCapsTitle("WESTERN PHILOSOPHY"),
      "Western Philosophy",
    );
  });

  it("preserves intentional non-latin titles", () => {
    assert.equal(normalizeAccidentalAllCapsTitle("پارگار"), "پارگار");
  });

  it("marks collection rows as semantic links", () => {
    assert.equal(LIFE_LAB_COLLECTION_ROW_LINK_ROLE, "link");
  });

  it("keeps pargar child videos out of channel groups in section view", () => {
    const notes = [
      noteSummary({
        slug: "videos__pargar-1",
        title: "Pargar: Episode 1",
        metadata: { channel: "BBC Persian" },
      }),
      noteSummary({
        slug: "videos__pargar-2",
        title: "Pargar: Episode 2",
        metadata: { channel: "BBC Persian" },
      }),
      noteSummary({
        slug: "videos__solo",
        title: "One-off lecture",
        metadata: { channel: "BBC Persian" },
      }),
    ];

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
    });

    const standaloneBlock = view.blocks.find(
      (block) => block.kind === "standalone-videos",
    );

    assert.equal(standaloneBlock?.seriesGroups.length, 1);
    assert.equal(standaloneBlock?.seriesGroups[0]?.title, "Pargar");

    const channelSlugs = standaloneBlock?.channelGroups.flatMap((group) =>
      group.notes.map((note) => note.slug),
    );

    assert.equal(channelSlugs?.includes("videos__pargar-1"), false);
    assert.equal(channelSlugs?.includes("videos__pargar-2"), false);
  });

  it("normalizes accidental all-caps playlist titles in section view cards", () => {
    const notes = [
      noteSummary({
        slug: "playlists__western-philosophy-index",
        title: "WESTERN PHILOSOPHY Index",
        subfolderLabel: "playlists",
        relativePath: "playlists/western-philosophy-index.md",
        excerpt: "12 processed · 0 pending · 0 errors",
        metadata: {
          type: "playlist-index",
          playlist: "WESTERN PHILOSOPHY",
        },
        dateLabel: "Jul 8, 2026",
      }),
      ...Array.from({ length: 12 }, (_, index) =>
        noteSummary({
          slug: `western-philosophy__lesson-${index + 1}`,
          title: `Lesson ${index + 1}`,
          subfolderLabel: "western-philosophy",
          relativePath: `western-philosophy/lesson-${index + 1}.md`,
          metadata: {
            playlist: "WESTERN PHILOSOPHY",
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

    assert.equal(playlistBlock?.items[0]?.title, "Western Philosophy");
  });
});
