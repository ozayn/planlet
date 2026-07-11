import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPlaylistVideoStatusIcon,
  PLAYLIST_VIDEO_STATUS_LABELS,
} from "@/lib/life-lab/playlist-video-icons";

describe("playlist video icons", () => {
  it("maps statuses to monochrome labels", () => {
    assert.equal(
      getPlaylistVideoStatusIcon("processed").label,
      PLAYLIST_VIDEO_STATUS_LABELS.processed,
    );
    assert.equal(
      getPlaylistVideoStatusIcon("pending").label,
      PLAYLIST_VIDEO_STATUS_LABELS.pending,
    );
    assert.equal(
      getPlaylistVideoStatusIcon("skipped").label,
      PLAYLIST_VIDEO_STATUS_LABELS.skipped,
    );
    assert.equal(
      getPlaylistVideoStatusIcon("error").label,
      PLAYLIST_VIDEO_STATUS_LABELS.error,
    );
  });
});
