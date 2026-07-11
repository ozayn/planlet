import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";
import {
  groupStandaloneVideosIntoSeries,
  partitionStandaloneBySeries,
  resolveSeriesCandidate,
  resolveSeriesThumbnail,
} from "@/lib/life-lab/standalone-series";
import { noteLibraryDedupeKey } from "@/lib/life-lab/youtube-library";

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

function pargarNotes(count = 3): LifeLabNoteSummary[] {
  return Array.from({ length: count }, (_, index) =>
    noteSummary({
      slug: `videos__pargar-${index + 1}`,
      title:
        index === 0
          ? "Pargar: Continental and Analytic Philosophy, Part 1"
          : index === 1
            ? "Pargar: Friedrich Nietzsche"
            : "Pargar: Hegel’s Philosophy of History, Part 1",
      metadata: { channel: "BBC Persian" },
      dateLabel: `Jul ${10 - index}, 2026`,
    }),
  );
}

describe("standalone video series", () => {
  it("groups Pargar-prefixed videos into one Pargar series", () => {
    const series = groupStandaloneVideosIntoSeries(pargarNotes(3));

    assert.equal(series.length, 1);
    assert.equal(series[0]?.title, "Pargar");
    assert.equal(series[0]?.slug, "pargar");
    assert.equal(series[0]?.videos.length, 3);
    assert.equal(series[0]?.channel, "BBC Persian");
  });

  it("keeps unrelated BBC Persian videos outside Pargar", () => {
    const notes = [
      ...pargarNotes(2),
      noteSummary({
        slug: "videos__other-show",
        title: "Documentary: Modern Iran",
        metadata: { channel: "BBC Persian" },
      }),
    ];

    const { seriesGroups, ungroupedNotes } = partitionStandaloneBySeries(notes);

    assert.equal(seriesGroups.length, 1);
    assert.equal(seriesGroups[0]?.title, "Pargar");
    assert.equal(ungroupedNotes.length, 1);
    assert.equal(ungroupedNotes[0]?.title, "Documentary: Modern Iran");
  });

  it("prefers explicit series metadata over title-prefix detection", () => {
    const candidate = resolveSeriesCandidate(
      noteSummary({
        slug: "videos__custom",
        title: "Other Prefix: Episode 1",
        metadata: { series: "Pargar" },
      }),
    );

    assert.equal(candidate?.title, "Pargar");
    assert.equal(candidate?.source, "metadata");
  });

  it("resolves series thumbnail from a valid child video", () => {
    const series = groupStandaloneVideosIntoSeries([
      noteSummary({
        slug: "videos__one",
        title: "Pargar: Episode 1",
        metadata: {
          channel: "BBC Persian",
          source_url: "https://www.youtube.com/watch?v=abc123XYZ01",
        },
      }),
      noteSummary({
        slug: "videos__two",
        title: "Pargar: Episode 2",
        metadata: {
          channel: "BBC Persian",
          source_url: "https://www.youtube.com/watch?v=def456UVW02",
        },
      }),
    ]);

    const thumbnail = resolveSeriesThumbnail(series[0]!);

    assert.equal(
      thumbnail?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("removes grouped videos from channel previews and individual listings", () => {
    const notes = [
      ...pargarNotes(3),
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

    assert.equal(standaloneBlock?.kind, "standalone-videos");
    assert.equal(standaloneBlock.seriesGroups.length, 1);
    assert.equal(standaloneBlock.seriesGroups[0]?.title, "Pargar");

    const channelNoteSlugs = standaloneBlock.channelGroups.flatMap((group) =>
      group.notes.map((note) => note.slug),
    );

    assert.equal(channelNoteSlugs.includes("videos__pargar-1"), false);
    assert.equal(channelNoteSlugs.includes("videos__solo"), true);
    assert.equal(
      standaloneBlock.individualNotes.some((note) => note.slug.startsWith("videos__pargar")),
      false,
    );
  });

  it("excludes series-owned child videos from recently added", () => {
    const notes = pargarNotes(3);

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
    });

    const recentBlock = view.blocks.find((block) => block.kind === "recently-added");

    assert.equal(recentBlock, undefined);
  });

  it("never groups playlist-owned videos into a series", () => {
    const notes = [
      ...pargarNotes(2).map((note) => ({
        ...note,
        metadata: {
          ...note.metadata,
          playlist: "Western Philosophy",
        },
        subfolderLabel: "western-philosophy",
        relativePath: `western-philosophy/${note.slug}.md`,
      })),
      noteSummary({
        slug: "playlists__western-philosophy-index",
        title: "Western Philosophy Index",
        subfolderLabel: "playlists",
        relativePath: "playlists/western-philosophy-index.md",
        metadata: {
          type: "playlist-index",
          playlist: "Western Philosophy",
        },
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

    assert.equal(standaloneBlock, undefined);
  });

  it("opens a filtered series destination with all series videos", () => {
    const notes = pargarNotes(4);

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
      seriesFilter: "pargar",
    });

    const standaloneBlock = view.blocks.find(
      (block) => block.kind === "standalone-videos",
    );

    assert.equal(standaloneBlock?.activeSeriesFilter, "pargar");
    assert.equal(standaloneBlock?.individualNotes.length, 4);
    assert.equal(standaloneBlock?.channelGroups.length, 0);
  });

  it("does not duplicate video identity across series and channel groups", () => {
    const notes = [
      ...pargarNotes(2),
      noteSummary({
        slug: "videos__solo",
        title: "Solo video",
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

    assert.equal(standaloneBlock?.kind, "standalone-videos");

    const keys = new Set<string>();

    for (const series of standaloneBlock.seriesGroups) {
      for (const note of series.videos) {
        const key = noteLibraryDedupeKey(note);
        assert.equal(keys.has(key), false);
        keys.add(key);
      }
    }

    for (const group of standaloneBlock.channelGroups) {
      for (const note of group.notes) {
        const key = noteLibraryDedupeKey(note);
        assert.equal(keys.has(key), false);
        keys.add(key);
      }
    }
  });
});
