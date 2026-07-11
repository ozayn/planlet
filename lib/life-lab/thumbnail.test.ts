import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  extractYouTubeVideoId,
  resolveLifeLabThumbnail,
  resolvePlaylistThumbnail,
  resolveYouTubeThumbnail,
} from "@/lib/life-lab/thumbnail";
import { resolvePlaylistVideoRowThumbnail } from "@/lib/life-lab/playlist-video-thumbnail";
import { listCollectionContentNotes } from "@/lib/life-lab/collection";
import { groupStandaloneVideosByChannel } from "@/lib/life-lab/standalone-channel";
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

  it("resolves the same thumbnail on landing and playlist detail rows", () => {
    const metadata = {
      source_url: "https://www.youtube.com/watch?v=abc123XYZ01",
      channel: "The School of Life",
    };

    const landing = resolveLifeLabThumbnail(
      noteSummary({
        slug: "videos__albert-camus",
        title: "Albert Camus",
        metadata,
      }),
    );
    const detail = resolvePlaylistVideoRowThumbnail({
      metadata,
      videoUrl: metadata.source_url,
      title: "Albert Camus",
    });

    assert.equal(landing?.url, detail?.url);
    assert.equal(
      landing?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("preserves thumbnail metadata through channel grouping", () => {
    const notes = [
      noteSummary({
        slug: "videos__episode-1",
        title: "Episode 1",
        subfolderLabel: "videos",
        metadata: {
          channel: "Great Art Explained",
          source_url: "https://www.youtube.com/watch?v=abc123XYZ01",
        },
      }),
      noteSummary({
        slug: "videos__episode-2",
        title: "Episode 2",
        subfolderLabel: "videos",
        metadata: {
          channel: "Great Art Explained",
          source_url: "https://www.youtube.com/watch?v=def456UVW02",
        },
      }),
    ];

    const groups = groupStandaloneVideosByChannel({
      notes,
      sort: "title",
    });

    assert.equal(groups[0]?.notes[0]?.metadata?.source_url, notes[0]?.metadata?.source_url);
    assert.equal(
      resolveLifeLabThumbnail(groups[0]!.notes[0]!)?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("preserves thumbnail metadata through dedupe", () => {
    const primary = noteSummary({
      slug: "videos__episode-1",
      title: "Episode 1",
      subfolderLabel: "videos",
      relativePath: "videos/episode-1.md",
      fileId: "file-1",
      metadata: {
        channel: "Shared Channel",
        source_url: "https://www.youtube.com/watch?v=abc123XYZ01",
      },
      dateLabel: "Jul 10, 2026",
    });
    const duplicate = {
      ...primary,
      slug: "videos__episode-1-copy",
      relativePath: "videos/episode-1-copy.md",
    };

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: [primary, duplicate],
      groups: [],
      hasActiveQuery: false,
    });

    const recentBlock = view.blocks.find((block) => block.kind === "recently-added");

    assert.equal(recentBlock?.notes.length, 1);
    assert.equal(
      resolveLifeLabThumbnail(recentBlock!.notes[0]!)?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("ignores artifact files when choosing playlist child thumbnails", () => {
    const indexNote = noteSummary({
      slug: "playlists__great-art-explained-index",
      title: "Great Art Explained Index",
      relativePath: "playlists/great-art-explained/index.md",
      metadata: { type: "playlist-index", playlist: "Great Art Explained" },
    });
    const allNotes = [
      indexNote,
      noteSummary({
        slug: "playlists__great-art-explained__readme",
        title: "README",
        relativePath: "playlists/great-art-explained/README.md",
        metadata: {
          image: { url: "https://example.com/readme-thumb.jpg" },
        },
      }),
      noteSummary({
        slug: "playlists__great-art-explained__episode-1",
        title: "Episode 1",
        relativePath: "playlists/great-art-explained/episode-1.md",
        metadata: {
          source_url: "https://www.youtube.com/watch?v=abc123XYZ01",
        },
      }),
    ];
    const contentNotes = listCollectionContentNotes(indexNote, allNotes);

    assert.equal(contentNotes.length, 1);
    assert.equal(
      resolvePlaylistThumbnail({ indexNote, contentNotes })?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("supports embed and live URLs through resolveYouTubeThumbnail", () => {
    assert.equal(
      resolveYouTubeThumbnail({
        sourceUrl: "https://www.youtube.com/embed/ghi789RST03",
      }),
      "https://i.ytimg.com/vi/ghi789RST03/hqdefault.jpg",
    );
    assert.equal(
      resolveYouTubeThumbnail({
        sourceUrl: "https://www.youtube.com/live/jkl012MNO04",
      }),
      "https://i.ytimg.com/vi/jkl012MNO04/hqdefault.jpg",
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
