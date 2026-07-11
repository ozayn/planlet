import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  extractYouTubeVideoId,
  resolveLifeLabThumbnail,
  resolvePlaylistThumbnail,
} from "@/lib/life-lab/thumbnail";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";

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

describe("life lab thumbnail resolution", () => {
  it("prefers explicit thumbnail frontmatter over derived youtube thumbnails", () => {
    const resolved = resolveLifeLabThumbnail(
      noteSummary({
        slug: "videos__episode-1",
        title: "Episode 1",
        metadata: {
          thumbnailUrl: "https://example.com/explicit-thumb.jpg",
          video_url: "https://www.youtube.com/watch?v=abc123XYZ01",
        },
      }),
    );

    assert.equal(resolved?.url, "https://example.com/explicit-thumb.jpg");
    assert.equal(resolved?.kind, "image");
  });

  it("derives youtube thumbnails from watch URLs", () => {
    const resolved = resolveLifeLabThumbnail(
      noteSummary({
        slug: "videos__episode-2",
        title: "Episode 2",
        metadata: {
          sourceUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
        },
      }),
    );

    assert.equal(
      resolved?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
    assert.equal(resolved?.kind, "youtube_thumbnail");
  });

  it("supports youtu.be and shorts URLs", () => {
    assert.equal(
      extractYouTubeVideoId("https://youtu.be/abc123XYZ01"),
      "abc123XYZ01",
    );
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/shorts/def456UVW02"),
      "def456UVW02",
    );

    const fromShort = resolveLifeLabThumbnail(
      noteSummary({
        slug: "videos__short",
        title: "Short",
        metadata: {
          source_url: "https://www.youtube.com/shorts/def456UVW02",
        },
      }),
    );

    assert.equal(
      fromShort?.url,
      "https://i.ytimg.com/vi/def456UVW02/hqdefault.jpg",
    );
  });

  it("falls back to the first child thumbnail for playlists", () => {
    const indexNote = noteSummary({
      slug: "playlists__sample-index",
      title: "Sample Index",
      metadata: { type: "playlist-index", playlist: "Sample" },
    });
    const contentNotes = [
      noteSummary({
        slug: "sample__episode-1",
        title: "Episode 1",
        metadata: {
          image: { url: "https://example.com/child-thumb.jpg" },
        },
      }),
    ];

    const resolved = resolvePlaylistThumbnail({ indexNote, contentNotes });

    assert.equal(resolved?.url, "https://example.com/child-thumb.jpg");
  });

  it("returns null when no thumbnail source exists", () => {
    assert.equal(
      resolveLifeLabThumbnail(
        noteSummary({
          slug: "videos__empty",
          title: "Empty",
        }),
      ),
      null,
    );
  });

  it("excludes recently added items from standalone preview by file id", () => {
    const standalones = Array.from({ length: 5 }, (_, index) =>
      noteSummary({
        slug: `videos__standalone-${index + 1}`,
        title: `Standalone ${index + 1}`,
        subfolderLabel: "videos",
        relativePath: `videos/standalone-${index + 1}.md`,
        fileId: `file-${index + 1}`,
        metadata: { channel: "Shared Channel" },
        dateLabel: `Jul ${10 - index}, 2026`,
      }),
    );
    const sixth = noteSummary({
      slug: "videos__standalone-6",
      title: "Standalone 6",
      subfolderLabel: "videos",
      relativePath: "videos/standalone-6.md",
      fileId: "file-6",
      metadata: { channel: "Shared Channel" },
      dateLabel: "Jul 4, 2026",
    });
    const aliasOfFirst = {
      ...standalones[0]!,
      slug: "videos__standalone-1-alias",
      relativePath: "videos/standalone-1-alias.md",
    };

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: [...standalones, aliasOfFirst, sixth],
      groups: [],
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

    const previewSlugs = new Set(
      standaloneBlock.channelGroups.flatMap((group) =>
        group.previewNotes.map((note) => note.slug),
      ),
    );

    assert.equal(previewSlugs.has("videos__standalone-6"), true);
    assert.equal(previewSlugs.has("videos__standalone-1-alias"), false);
  });
});
