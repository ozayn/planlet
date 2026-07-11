import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { noteMatchesFilters } from "@/lib/life-lab/filters";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";
import {
  groupStandaloneVideosByChannel,
  resolveStandaloneChannel,
  STANDALONE_OTHER_CHANNEL_LABEL,
} from "@/lib/life-lab/standalone-channel";
import { isStandaloneYoutubeVideo } from "@/lib/life-lab/youtube-library";

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

function standaloneVideo(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  return noteSummary({
    subfolderLabel: "videos",
    relativePath: partial.relativePath ?? `videos/${partial.slug}.md`,
    ...partial,
  });
}

describe("standalone channel grouping", () => {
  it("groups videos with the same channel together", () => {
    const notes = [
      standaloneVideo({
        slug: "school-1",
        title: "School 1",
        metadata: { channel: "The School of Life" },
      }),
      standaloneVideo({
        slug: "school-2",
        title: "School 2",
        metadata: { channel: "The School of Life" },
      }),
      standaloneVideo({
        slug: "bplus-1",
        title: "Bplus 1",
        metadata: { channelName: "Bplus Podcast" },
      }),
    ];

    const groups = groupStandaloneVideosByChannel({ notes, sort: "title" });

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.label, "Bplus Podcast");
    assert.equal(groups[0]?.totalCount, 1);
    assert.equal(groups[1]?.label, "The School of Life");
    assert.equal(groups[1]?.totalCount, 2);
  });

  it("keeps different channels separate without fuzzy merging", () => {
    const notes = [
      standaloneVideo({
        slug: "bplus-a",
        title: "A",
        metadata: { channel: "Bplus Podcast" },
      }),
      standaloneVideo({
        slug: "yale-b",
        title: "B",
        metadata: { channel: "YaleCourses" },
      }),
    ];

    const groups = groupStandaloneVideosByChannel({ notes, sort: "title" });

    assert.equal(groups.length, 2);
  });

  it("normalizes duplicate channel labels only with canonical channel id", () => {
    const notes = [
      standaloneVideo({
        slug: "school-a",
        title: "A",
        metadata: {
          channel: "School of Life",
          youtubeChannelId: "UCschool",
        },
      }),
      standaloneVideo({
        slug: "school-b",
        title: "B",
        metadata: {
          channel: "The School of Life",
          youtubeChannelId: "UCschool",
        },
      }),
    ];

    const groups = groupStandaloneVideosByChannel({ notes, sort: "title" });

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.totalCount, 2);
    assert.equal(groups[0]?.label, "The School of Life");
  });

  it("places missing channel metadata in Other", () => {
    const groups = groupStandaloneVideosByChannel({
      notes: [standaloneVideo({ slug: "orphan", title: "Orphan" })],
      sort: "title",
    });

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.label, STANDALONE_OTHER_CHANNEL_LABEL);
    assert.equal(groups[0]?.slug, "other");
  });

  it("excludes playlist-owned notes from standalone grouping", () => {
    const playlistOwned = standaloneVideo({
      slug: "playlist-video",
      title: "Playlist video",
      metadata: { channel: "YaleCourses", playlist: "Justice" },
    });

    assert.equal(isStandaloneYoutubeVideo(playlistOwned), false);
  });

  it("respects active sort inside channel groups", () => {
    const notes = [
      standaloneVideo({
        slug: "zeta",
        title: "Zeta",
        metadata: { channel: "Sample Channel" },
      }),
      standaloneVideo({
        slug: "alpha",
        title: "Alpha",
        metadata: { channel: "Sample Channel" },
      }),
    ];

    const groups = groupStandaloneVideosByChannel({ notes, sort: "title" });

    assert.deepEqual(
      groups[0]?.notes.map((note) => note.title),
      ["Alpha", "Zeta"],
    );
  });

  it("excludes recently added keys from visible channel preview", () => {
    const notes = Array.from({ length: 8 }, (_, index) =>
      standaloneVideo({
        slug: `videos__standalone-${index + 1}`,
        title: `Standalone ${index + 1}`,
        fileId: `file-${index + 1}`,
        metadata: { channel: "The School of Life" },
        dateLabel: `Jul ${10 - index}, 2026`,
      }),
    );

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
      sort: "recent",
    });

    const recentBlock = view.blocks.find((block) => block.kind === "recently-added");
    const standaloneBlock = view.blocks.find(
      (block) => block.kind === "standalone-videos",
    );

    assert.equal(recentBlock?.kind, "recently-added");
    assert.equal(recentBlock?.notes.length, 5);

    assert.equal(standaloneBlock?.kind, "standalone-videos");
    const group = standaloneBlock.channelGroups[0];
    assert.equal(group?.totalCount, 8);
    assert.equal(group?.previewNotes.length, 3);
    assert.equal(
      group?.previewNotes.some((note) => note.slug === "videos__standalone-1"),
      false,
    );
  });

  it("filters standalone videos by normalized channel slug", () => {
    const notes = [
      standaloneVideo({
        slug: "school-1",
        title: "School 1",
        metadata: { channel: "The School of Life" },
      }),
      standaloneVideo({
        slug: "bplus-1",
        title: "Bplus 1",
        metadata: { channel: "Bplus Podcast" },
      }),
    ];

    const matches = notes.filter((note) =>
      noteMatchesFilters(note, { channel: "the-school-of-life" }),
    );

    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.slug, "school-1");
  });

  it("builds channel-filtered standalone browse blocks", () => {
    const notes = [
      standaloneVideo({
        slug: "school-1",
        title: "School 1",
        metadata: { channel: "The School of Life" },
      }),
      standaloneVideo({
        slug: "school-2",
        title: "School 2",
        metadata: { channel: "The School of Life" },
      }),
      standaloneVideo({
        slug: "bplus-1",
        title: "Bplus 1",
        metadata: { channel: "Bplus Podcast" },
      }),
    ];

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes,
      groups: [],
      hasActiveQuery: false,
      channelFilter: "the-school-of-life",
      sort: "title",
    });

    const standaloneBlock = view.blocks.find(
      (block) => block.kind === "standalone-videos",
    );

    assert.equal(standaloneBlock?.kind, "standalone-videos");
    assert.equal(standaloneBlock.activeChannelFilter, "the-school-of-life");
    assert.equal(standaloneBlock.channelGroups.length, 1);
    assert.equal(standaloneBlock.channelGroups[0]?.previewNotes.length, 2);
  });

  it("applies explicit label aliases only through exact mapping", () => {
    const channel = resolveStandaloneChannel({
      metadata: { channel: "School of Life" },
    });

    assert.equal(channel.label, "The School of Life");
    assert.equal(channel.slug, "the-school-of-life");
  });
});
