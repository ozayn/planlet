import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import {
  buildPodcastTimelinePreview,
  findPodcastShowIndex,
  isPodcastBlockedFolder,
  isPodcastEpisodeNote,
  isPodcastShowIndex,
  isPodcastVisibleMarkdown,
  parsePodcastShowIndex,
  resolvePodcastNoteRelativePath,
} from "@/lib/life-lab/podcasts";
import {
  parseLifeLabTimeline,
  timelineTimestampToSpeech,
} from "@/lib/life-lab/timeline";

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

  it("recognizes Ava's current podcast index and episode frontmatter types", () => {
    assert.equal(
      isPodcastShowIndex(
        note({
          slug: "the-daily__index",
          title: "The Daily",
          relativePath: "the-daily/index.md",
          metadata: {
            type: "podcast-show-index",
            section: "podcasts",
            show: "The Daily",
          },
        }),
      ),
      true,
    );
    assert.equal(
      isPodcastEpisodeNote(
        note({
          slug: "the-daily__episodes__example",
          title: "Example",
          relativePath: "the-daily/episodes/example.md",
          metadata: {
            type: "podcast-episode-note",
            section: "podcasts",
          },
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
    assert.equal(
      show.episodes.find((item) => item.title === "Ready episode")?.status,
      "error",
    );
    assert.equal(show.processedCount, 0);
    assert.equal(show.errorCount, 2);
  });

  it("removes the Show summary heading from the series description", () => {
    const show = parsePodcastShowIndex({
      note: {
        ...showIndex,
        metadata: { ...showIndex.metadata, summary: undefined },
        podcastIndexContent: `# The Daily

## Show summary

A clear daily news briefing.

## Episodes

| Date | Status | Episode | Duration | Note |
|---|---|---|---|---|`,
      },
      relatedNotes: [],
    });

    assert.equal(show.description, "A clear daily news briefing.");
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

describe("podcast timeline disclosure", () => {
  it("keeps table headers and the first three timeline rows in the preview", () => {
    const timeline = `| Time | Event |
|---|---|
| 00:00 | One |
| 01:00 | Two |
| 02:00 | Three |
| 03:00 | Four |`;
    const result = buildPodcastTimelinePreview(timeline);

    assert.equal(result.itemCount, 4);
    assert.match(result.preview, /Three/);
    assert.doesNotMatch(result.preview, /Four/);
  });

  it("parses short timestamps and preserves long descriptions", () => {
    const description =
      "Introduction: Mamdani's early mayoral wins and the political context around them.";
    const items = parseLifeLabTimeline(`| Time | Moment |
|---|---|
| 00:00 | ${description} |
| 03:00 | Trump-amplified deportation rhetoric |
| 07:00 | Democratic socialism defended |`);

    assert.deepEqual(items[0], { timestamp: "00:00", description });
    assert.equal(items.length, 3);
  });

  it("parses list timelines and speaks timestamps naturally", () => {
    assert.deepEqual(
      parseLifeLabTimeline("- **00:00** — Introduction\n- 03:15 Main argument"),
      [
        { timestamp: "00:00", description: "Introduction" },
        { timestamp: "03:15", description: "Main argument" },
      ],
    );
    assert.equal(timelineTimestampToSpeech("00:00"), "Zero minutes.");
    assert.equal(
      timelineTimestampToSpeech("03:15"),
      "Three minutes, fifteen seconds.",
    );
  });
});
