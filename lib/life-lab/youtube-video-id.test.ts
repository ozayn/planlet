import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractYouTubeVideoId,
  isYouTubeVideoId,
  youtubeThumbnailUrlFromVideoId,
} from "@/lib/life-lab/youtube-video-id";

describe("extractYouTubeVideoId", () => {
  it("extracts video ids from watch URLs", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=abc123XYZ01"),
      "abc123XYZ01",
    );
  });

  it("extracts video ids from youtu.be URLs", () => {
    assert.equal(
      extractYouTubeVideoId("https://youtu.be/def456UVW02"),
      "def456UVW02",
    );
  });

  it("extracts video ids from shorts URLs", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/shorts/ghi789RST03"),
      "ghi789RST03",
    );
  });

  it("extracts video ids from embed URLs", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/embed/jkl012MNO04"),
      "jkl012MNO04",
    );
  });

  it("accepts bare 11-character video ids", () => {
    assert.equal(isYouTubeVideoId("abc123XYZ01"), true);
    assert.equal(extractYouTubeVideoId("abc123XYZ01"), "abc123XYZ01");
  });

  it("builds hqdefault thumbnail urls", () => {
    assert.equal(
      youtubeThumbnailUrlFromVideoId("abc123XYZ01"),
      "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
    );
  });
});
