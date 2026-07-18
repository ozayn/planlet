import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  findPodcastShowIndex,
  isPodcastBlockedFolder,
  isPodcastEpisodeNote,
  isPodcastShowIndex,
  isPodcastVisibleMarkdown,
  parsePodcastShowIndex,
  resolvePodcastNoteRelativePath,
} from "@/lib/life-lab/podcasts";

function note(
  partial: Partial<LifeLabNoteSummary> &
    Pick<LifeLabNoteSummary, "slug" | "title" | "relativePath">,
): LifeLabNoteSummary {
  return {
    excerpt: "",
    modifiedAt: null,
    modifiedAtLabel: null,
    dateLabel: null,
    subfolderLabel: partial.relativePath.split("/")[0] ?? null,
    fileId: `file-${partial.slug}`,
    ...partial,
  };
}

const showIndex = note({
  slug: "the-daily__index",
  title: "Index",
  relativePath: "the-daily/index.md",
  modifiedAt: "2026-07-18T12:00:00Z",
  metadata: {
    type: "podcast-series",
    show: "The Daily",
    summary: "A concise daily news podcast.",
    image: { url: "https://example.com/the-daily.jpg" },
  },
  podcastIndexContent: `# The Daily

A concise daily news podcast.

## Episodes

| Date | Status | Episode | Duration | Note |
|---|---|---|---|---|
| 2026-07-18 | pending | Waiting for the note | 42:00 | |
| 2026-07-17 | processed | Ready episode | 65:00 | [Open note](episodes/2026-07-17-ready.md) |
| 2026-07-16 | error | Failed episode | 31:00 | |
`,
});

const episode = note({
  slug: "the-daily__episodes__2026-07-17-ready",
  title: "Ready Episode",
  relativePath: "the-daily/episodes/2026-07-17-ready.md",
  metadata: {
    type: "podcast-note",
    episode_title: "Ready episode",
    show: "The Daily",
  },
});

describe("podcast discovery safety", () => {
  it("recognizes show indexes and episode notes at nested paths", () => {
    assert.equal(isPodcastShowIndex(showIndex), true);
    assert.equal(isPodcastEpisodeNote(episode), true);
    assert.equal(
      isPodcastEpisodeNote(
        note({
          slug: "network__show__season__episode",
          title: "Episode",
          relativePath: "network/show/season/episode.md",
          metadata: { type: "podcast-episode" },
        }),
      ),
      true,
    );
  });

  it("excludes private, working, transcript, chunk, draft, and log content", () => {
    assert.equal(isPodcastBlockedFolder("private"), true);
    assert.equal(isPodcastBlockedFolder("episodes", "show/private"), true);
    assert.equal(isPodcastVisibleMarkdown("show/working/notes.md"), false);
    assert.equal(
      isPodcastVisibleMarkdown("show/transcripts/episode.md"),
      false,
    );
    assert.equal(isPodcastVisibleMarkdown("show/episode-chunk-02.md"), false);
    assert.equal(isPodcastVisibleMarkdown("show/synthesis-draft.md"), false);
    assert.equal(isPodcastVisibleMarkdown("show/status-log.md"), false);
    assert.equal(
      isPodcastVisibleMarkdown("show/episodes/2026-07-18-news.md"),
      true,
    );
  });
});

describe("podcast show index parsing", () => {
  it("parses processed, pending, and error rows without fake links", () => {
    const show = parsePodcastShowIndex({
      note: showIndex,
      relatedNotes: [showIndex, episode],
    });

    assert.equal(show.title, "The Daily");
    assert.equal(show.totalCount, 3);
    assert.equal(show.processedCount, 1);
    assert.equal(show.pendingCount, 1);
    assert.equal(show.errorCount, 1);
    assert.equal(show.episodes[0]?.title, "Waiting for the note");
    assert.equal(show.episodes[0]?.noteHref, null);
    assert.equal(
      show.episodes[1]?.noteHref,
      "/life-lab/podcasts/the-daily__episodes__2026-07-17-ready",
    );
    assert.equal(show.episodes[2]?.noteHref, null);
  });

  it("keeps a processed row non-clickable until its note exists", () => {
    const show = parsePodcastShowIndex({
      note: showIndex,
      relatedNotes: [showIndex],
    });

    assert.equal(
      show.episodes.find((item) => item.title === "Ready episode")?.noteHref,
      null,
    );
  });

  it("resolves links relative to the index and rejects traversal or URLs", () => {
    assert.equal(
      resolvePodcastNoteRelativePath(
        "network/the-daily/index.md",
        "episodes/example.md",
      ),
      "network/the-daily/episodes/example.md",
    );
    assert.equal(
      resolvePodcastNoteRelativePath("show/index.md", "../../private/x.md"),
      null,
    );
    assert.equal(
      resolvePodcastNoteRelativePath(
        "show/index.md",
        "https://example.com/x.md",
      ),
      null,
    );
  });

  it("finds the closest owning show index", () => {
    const nestedShow = note({
      slug: "network__show__index",
      title: "Index",
      relativePath: "network/show/index.md",
    });
    const nestedEpisode = note({
      slug: "network__show__episodes__ep",
      title: "Episode",
      relativePath: "network/show/episodes/ep.md",
    });

    assert.equal(
      findPodcastShowIndex(nestedEpisode, [showIndex, nestedShow])?.slug,
      nestedShow.slug,
    );
  });
});
