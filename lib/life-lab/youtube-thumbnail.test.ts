import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveYouTubeThumbnail } from "@/lib/life-lab/youtube-thumbnail";
import { extractYouTubeVideoId } from "@/lib/life-lab/youtube-video-id";

describe("resolveYouTubeThumbnail", () => {
  it("prefers an explicit thumbnail URL", () => {
    assert.equal(
      resolveYouTubeThumbnail({
        thumbnailUrl: "https://example.com/cover.jpg",
        sourceUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
      }),
      "https://example.com/cover.jpg",
    );
  });

  it("derives thumbnails from explicit video IDs", () => {
    assert.equal(
      resolveYouTubeThumbnail({
        youtubeVideoId: "abc123XYZ01",
      }),
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
    assert.equal(
      resolveYouTubeThumbnail({
        videoId: "def456UVW02",
      }),
      "https://i.ytimg.com/vi/def456UVW02/hqdefault.jpg",
    );
  });

  it("derives thumbnails from supported YouTube source URLs", () => {
    const cases = [
      ["watch", "https://www.youtube.com/watch?v=abc123XYZ01"],
      ["youtu.be", "https://youtu.be/abc123XYZ01"],
      ["shorts", "https://www.youtube.com/shorts/def456UVW02"],
      ["embed", "https://www.youtube.com/embed/ghi789RST03"],
      ["live", "https://www.youtube.com/live/jkl012MNO04"],
    ] as const;

    for (const [label, sourceUrl] of cases) {
      const videoId = extractYouTubeVideoId(sourceUrl);

      assert.ok(videoId, `expected video id for ${label}`);
      assert.equal(
        resolveYouTubeThumbnail({ sourceUrl }),
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      );
    }
  });

  it("returns null for invalid or non-YouTube URLs", () => {
    assert.equal(
      resolveYouTubeThumbnail({
        thumbnailUrl: "not-a-url",
        sourceUrl: "https://example.com/not-youtube",
      }),
      null,
    );
  });

  it("derives from sourceUrl when cached items lack thumbnail fields", () => {
    assert.equal(
      resolveYouTubeThumbnail({
        sourceUrl: "https://www.youtube.com/watch?v=abc123XYZ01",
      }),
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });
});
