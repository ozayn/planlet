import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  extractLifeLabListingMetadata,
  hasListingThumbnailInputs,
  mergeListingMetadata,
} from "@/lib/life-lab/listing-metadata";
import { resolvePlaylistThumbnail, resolveLifeLabThumbnail } from "@/lib/life-lab/thumbnail";
import { groupStandaloneVideosByChannel } from "@/lib/life-lab/standalone-channel";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";
import { listCollectionContentNotes } from "@/lib/life-lab/collection";

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

describe("life lab listing metadata", () => {
  it("retains thumbnailUrl from frontmatter", () => {
    const listing = extractLifeLabListingMetadata(`---
thumbnailUrl: https://example.com/explicit.jpg
sourceUrl: https://www.youtube.com/watch?v=abc123XYZ01
---

# Episode
`);

    assert.equal(listing.thumbnailUrl, "https://example.com/explicit.jpg");
    assert.equal(
      listing.source_url,
      "https://www.youtube.com/watch?v=abc123XYZ01",
    );
  });

  it("retains sourceUrl and derives videoId + thumbnail", () => {
    const listing = extractLifeLabListingMetadata(`---
sourceUrl: https://www.youtube.com/watch?v=abc123XYZ01
channel: Great Art Explained
---

# Episode
`);

    assert.equal(
      listing.sourceUrl ?? listing.source_url,
      "https://www.youtube.com/watch?v=abc123XYZ01",
    );
    assert.equal(listing.youtubeVideoId, "abc123XYZ01");
    assert.equal(listing.videoId, "abc123XYZ01");
    assert.equal(
      listing.thumbnailUrl,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
    assert.equal(listing.channel, "Great Art Explained");
  });

  it("extracts source from body before display filtering would strip it", () => {
    const listing = extractLifeLabListingMetadata(`---
type: youtube-learning
---

Source: https://youtu.be/def456UVW02

<!-- planlet:hidden -->
Source: https://example.com/should-not-matter
<!-- /planlet:hidden -->

Body text.
`);

    assert.equal(listing.source_url, "https://youtu.be/def456UVW02");
    assert.equal(listing.youtubeVideoId, "def456UVW02");
    assert.equal(
      listing.thumbnailUrl,
      "https://i.ytimg.com/vi/def456UVW02/hqdefault.jpg",
    );
  });

  it("treats old index shells without thumbnail fields as needing rebuild", () => {
    assert.equal(hasListingThumbnailInputs(undefined), false);
    assert.equal(hasListingThumbnailInputs({}), false);
    assert.equal(hasListingThumbnailInputs({ channel: "Only Channel" }), false);
    assert.equal(
      hasListingThumbnailInputs({
        source_url: "https://www.youtube.com/watch?v=abc123XYZ01",
      }),
      true,
    );
  });

  it("merges listing metadata onto path-only records", () => {
    const listing = extractLifeLabListingMetadata(`---
sourceUrl: https://www.youtube.com/watch?v=abc123XYZ01
---

# Note
`);
    const merged = mergeListingMetadata(undefined, listing);

    assert.equal(
      resolveLifeLabThumbnail(
        noteSummary({
          slug: "videos__episode",
          title: "Episode",
          metadata: merged,
        }),
      )?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("preserves thumbnail metadata through grouping", () => {
    const notes = [
      noteSummary({
        slug: "videos__one",
        title: "One",
        subfolderLabel: "videos",
        metadata: extractLifeLabListingMetadata(`---
channel: Shared
sourceUrl: https://www.youtube.com/watch?v=abc123XYZ01
---
`),
      }),
      noteSummary({
        slug: "videos__two",
        title: "Two",
        subfolderLabel: "videos",
        metadata: extractLifeLabListingMetadata(`---
channel: Shared
sourceUrl: https://www.youtube.com/watch?v=def456UVW02
---
`),
      }),
    ];

    const groups = groupStandaloneVideosByChannel({ notes, sort: "title" });

    assert.equal(
      resolveLifeLabThumbnail(groups[0]!.notes[0]!)?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("preserves thumbnail metadata through recently-added dedupe", () => {
    const listing = extractLifeLabListingMetadata(`---
sourceUrl: https://www.youtube.com/watch?v=abc123XYZ01
---
`);
    const primary = noteSummary({
      slug: "videos__episode-1",
      title: "Episode 1",
      subfolderLabel: "videos",
      relativePath: "videos/episode-1.md",
      fileId: "file-1",
      metadata: listing,
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

  it("falls back playlist thumbs to first child listing thumbnail", () => {
    const indexNote = noteSummary({
      slug: "playlists__sample-index",
      title: "Sample Index",
      relativePath: "playlists/sample/index.md",
      metadata: { type: "playlist-index", playlist: "Sample" },
    });
    const allNotes = [
      indexNote,
      noteSummary({
        slug: "playlists__sample__episode-1",
        title: "Episode 1",
        relativePath: "playlists/sample/episode-1.md",
        metadata: extractLifeLabListingMetadata(`---
sourceUrl: https://www.youtube.com/watch?v=abc123XYZ01
---
`),
      }),
    ];
    const contentNotes = listCollectionContentNotes(indexNote, allNotes);

    assert.equal(
      resolvePlaylistThumbnail({ indexNote, contentNotes })?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });
});
