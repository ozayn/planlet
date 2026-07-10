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

describe("life lab section view", () => {
  it("formats playlist progress summaries for cards", () => {
    assert.equal(
      formatPlaylistCardProgress("26 processed · 0 pending · 0 errors"),
      "Processed 26 · Pending 0",
    );
  });

  it("builds a calm youtube browse view with playlists and collapsed reference", () => {
    const notes = [
      noteSummary({
        slug: "playlists__death-with-shelly-kagan",
        title: "Death with Shelly Kagan",
        subfolderLabel: "playlists",
        relativePath: "playlists/death-with-shelly-kagan.md",
        excerpt: "26 processed · 0 pending · 0 errors",
        metadata: {
          type: "playlist-index",
          playlist: "Death with Shelly Kagan",
          study_status: "studying",
        },
        dateLabel: "Jul 10, 2026",
      }),
      noteSummary({
        slug: "videos__2026-07-10-soul",
        title: "Arguments for the Soul",
        subfolderLabel: "videos",
        relativePath: "videos/2026-07-10-soul.md",
        metadata: {
          playlist: "Death with Shelly Kagan",
          study_status: "studying",
        },
        dateLabel: "Jul 10, 2026",
      }),
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
          notes: [notes[1]],
          collapsedByDefault: false,
          variant: "primary",
        },
        {
          id: "reference",
          label: "Reference",
          notes: [notes[2]],
          collapsedByDefault: true,
          variant: "disclosure",
        },
        {
          id: "about",
          label: "About this section",
          notes: [notes[3]],
          collapsedByDefault: true,
          variant: "disclosure",
        },
      ],
      hasActiveQuery: false,
    });

    assert.equal(view.mode, "browse");
    assert.equal(view.blocks[0]?.kind, "continue-learning");
    assert.equal(view.blocks.some((block) => block.kind === "playlists"), true);
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
        (block) => block.kind === "group" && block.group.label === "Reference",
      ),
      true,
    );
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
