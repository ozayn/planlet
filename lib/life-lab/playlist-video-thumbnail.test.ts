import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePlaylistVideoRowThumbnail } from "@/lib/life-lab/playlist-video-thumbnail";

describe("playlist video row thumbnails", () => {
  it("prefers explicit thumbnail frontmatter over derived youtube thumbnails", () => {
    const resolved = resolvePlaylistVideoRowThumbnail({
      metadata: {
        thumbnailUrl: "https://example.com/explicit-thumb.jpg",
        video_url: "https://www.youtube.com/watch?v=abc123XYZ01",
      },
      videoUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
      title: "Episode 1",
    });

    assert.equal(resolved?.url, "https://example.com/explicit-thumb.jpg");
    assert.equal(resolved?.kind, "image");
  });

  it("derives thumbnails from playlist row video URLs", () => {
    const resolved = resolvePlaylistVideoRowThumbnail({
      videoUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
      title: "Episode 2",
    });

    assert.equal(
      resolved?.url,
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
    assert.equal(resolved?.kind, "youtube_thumbnail");
  });

  it("derives thumbnails from youtubeVideoId metadata", () => {
    const resolved = resolvePlaylistVideoRowThumbnail({
      metadata: {
        youtubeVideoId: "def456UVW02",
      },
      title: "Episode 3",
    });

    assert.equal(
      resolved?.url,
      "https://i.ytimg.com/vi/def456UVW02/hqdefault.jpg",
    );
  });

  it("returns null when no thumbnail source exists", () => {
    assert.equal(
      resolvePlaylistVideoRowThumbnail({
        title: "Unavailable episode",
      }),
      null,
    );
  });
});
