import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isInternalPlaylistTitle,
  isNonPlayableMetadataNote,
  isPlayableYoutubeNote,
} from "@/lib/life-lab/youtube-browse";
import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";

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

describe("life lab youtube browse helpers", () => {
  it("detects internal playlist titles", () => {
    assert.equal(isInternalPlaylistTitle("YouTube Playlist Processing"), true);
    assert.equal(isInternalPlaylistTitle("Processing"), true);
    assert.equal(isInternalPlaylistTitle("Death with Shelly Kagan"), false);
  });

  it("excludes metadata-only filenames from playable notes", () => {
    assert.equal(
      isNonPlayableMetadataNote(
        noteSummary({
          slug: "channels",
          title: "Channels",
          relativePath: "channels.md",
        }),
      ),
      true,
    );
    assert.equal(
      isPlayableYoutubeNote(
        noteSummary({
          slug: "videos__soul",
          title: "Soul",
          subfolderLabel: "videos",
          relativePath: "videos/soul.md",
        }),
      ),
      true,
    );
    assert.equal(
      isPlayableYoutubeNote(
        noteSummary({
          slug: "channels",
          title: "Channels",
          relativePath: "channels.md",
        }),
      ),
      false,
    );
  });
});
