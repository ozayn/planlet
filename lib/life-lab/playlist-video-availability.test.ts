import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterVisiblePlaylistVideos,
  isUnavailablePlaylistVideo,
} from "@/lib/life-lab/playlist-video-availability";
import type { PlaylistVideoRow } from "@/lib/life-lab/playlist-index";

function video(partial: Partial<PlaylistVideoRow> & Pick<PlaylistVideoRow, "title">): PlaylistVideoRow {
  return {
    episode: null,
    status: "processed",
    duration: null,
    videoUrl: "https://youtu.be/demo",
    noteFilename: "videos/demo.md",
    noteSlug: "videos__demo",
    noteHref: "/life-lab/youtube-learning/videos__demo",
    ...partial,
  };
}

describe("playlist video availability", () => {
  it("treats unavailable video titles as hidden entries", () => {
    assert.equal(
      isUnavailablePlaylistVideo(
        video({ title: "Unavailable video", noteSlug: null, noteHref: null }),
      ),
      true,
    );
  });

  it("excludes unavailable videos from visible cards and counts", () => {
    const result = filterVisiblePlaylistVideos({
      videos: [
        video({ title: "Aristotle" }),
        video({
          title: "Unavailable video",
          noteSlug: null,
          noteHref: null,
          noteFilename: null,
          videoUrl: null,
        }),
      ],
    });

    assert.equal(result.visibleVideos.length, 1);
    assert.equal(result.hiddenUnavailableCount, 1);
    assert.equal(result.visibleVideos[0]?.title, "Aristotle");
  });

  it("keeps pending videos that still have a source url", () => {
    assert.equal(
      isUnavailablePlaylistVideo(
        video({
          title: "Pending lecture",
          status: "pending",
          noteSlug: null,
          noteHref: null,
          noteFilename: null,
        }),
      ),
      false,
    );
  });
});
