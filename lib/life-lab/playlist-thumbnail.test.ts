import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  resolvePlaylistCardThumbnail,
  resolvePlaylistIndexImage,
  youtubeThumbnailFromVideoUrl,
  youtubeVideoIdFromUrl,
} from "@/lib/life-lab/playlist-thumbnail";

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

describe("playlist thumbnails", () => {
  it("extracts youtube video ids and thumbnail urls", () => {
    assert.equal(
      youtubeVideoIdFromUrl("https://www.youtube.com/watch?v=abc123XYZ01"),
      "abc123XYZ01",
    );
    assert.equal(
      youtubeThumbnailFromVideoUrl(
        "https://www.youtube.com/watch?v=abc123XYZ01",
      )?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });

  it("prefers explicit index frontmatter images", () => {
    const image = resolvePlaylistIndexImage({
      thumbnailUrl: "https://example.com/cover.jpg",
      image: {
        url: "https://example.com/image.jpg",
      },
    });

    assert.equal(image?.url, "https://example.com/cover.jpg");
  });

  it("falls back to coverImage and image metadata", () => {
    assert.equal(
      resolvePlaylistIndexImage({
        coverImage: { url: "https://example.com/cover.jpg" },
      })?.url,
      "https://example.com/cover.jpg",
    );
    assert.equal(
      resolvePlaylistIndexImage({
        image: { url: "https://example.com/image.jpg" },
      })?.url,
      "https://example.com/image.jpg",
    );
  });

  it("uses the first child note thumbnail when the index has none", () => {
    const indexNote = noteSummary({
      slug: "playlists__great-art-explained-index",
      title: "Great Art Explained Index",
      metadata: { type: "playlist-index", playlist: "Great Art Explained" },
    });
    const contentNotes = [
      noteSummary({
        slug: "great-art-explained__episode-1",
        title: "Episode 1",
        metadata: {
          youtube_thumbnail: {
            url: "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
          },
        },
      }),
    ];

    const thumbnail = resolvePlaylistCardThumbnail({ indexNote, contentNotes });

    assert.equal(
      thumbnail?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
    assert.equal(thumbnail?.kind, "youtube_thumbnail");
  });

  it("derives a youtube thumbnail from child video urls when needed", () => {
    const indexNote = noteSummary({
      slug: "playlists__justice-index",
      title: "Justice with Michael Sandel Index",
      metadata: {
        type: "playlist-index",
        playlist_url: "https://www.youtube.com/playlist?list=PLexample",
      },
    });
    const contentNotes = [
      noteSummary({
        slug: "justice__lecture-1",
        title: "Lecture 1",
        metadata: {
          video_url: "https://www.youtube.com/watch?v=def456UVW02",
        },
      }),
    ];

    assert.equal(
      resolvePlaylistCardThumbnail({ indexNote, contentNotes })?.url,
      "https://i.ytimg.com/vi/def456UVW02/hqdefault.jpg",
    );
  });

  it("returns null when no thumbnail source exists", () => {
    const indexNote = noteSummary({
      slug: "playlists__empty-index",
      title: "Empty Index",
      metadata: { type: "playlist-index" },
    });

    assert.equal(
      resolvePlaylistCardThumbnail({ indexNote, contentNotes: [] }),
      null,
    );
  });
});
