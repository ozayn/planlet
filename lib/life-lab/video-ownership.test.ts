import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LifeLabNoteSummary } from "@/lib/life-lab/constants";
import { buildLifeLabSectionView } from "@/lib/life-lab/section-view";
import {
  buildPlaylistOwnershipRegistry,
  classifyVideoOwnership,
} from "@/lib/life-lab/video-ownership";
import {
  createYoutubeLibraryClassifier,
  isStandaloneYoutubeVideo,
  noteLibraryDedupeKey,
} from "@/lib/life-lab/youtube-library";

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

function playlistIndex(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
): LifeLabNoteSummary {
  const stem = partial.slug.replace(/^playlists__/, "");

  return noteSummary({
    subfolderLabel: "playlists",
    relativePath: partial.relativePath ?? `playlists/${stem}.md`,
    metadata: {
      type: "playlist-index",
      playlist: partial.metadata?.playlist ?? partial.title,
      ...partial.metadata,
    },
    ...partial,
  });
}

function playlistVideo(
  partial: Partial<LifeLabNoteSummary> & Pick<LifeLabNoteSummary, "slug" | "title">,
  playlist: string,
): LifeLabNoteSummary {
  const slug = partial.slug;
  const folder = playlist
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return noteSummary({
    subfolderLabel: folder,
    relativePath: partial.relativePath ?? `${folder}/${slug}.md`,
    metadata: {
      playlist,
      ...partial.metadata,
    },
    ...partial,
  });
}

describe("video ownership classification", () => {
  it("classifies explicit playlistId metadata as playlist-owned", () => {
    const index = playlistIndex({
      slug: "playlists__justice-index",
      title: "Justice Index",
      metadata: {
        playlist: "Justice",
        youtubePlaylistId: "PLjustice123",
      },
    });
    const video = noteSummary({
      slug: "justice__lecture-1",
      title: "Lecture 1",
      subfolderLabel: "videos",
      relativePath: "videos/lecture-1.md",
      metadata: {
        playlist: "Justice",
        youtubePlaylistId: "PLjustice123",
        video_url: "https://www.youtube.com/watch?v=abc123XYZ01",
      },
    });
    const notes = [index, video];
    const registry = buildPlaylistOwnershipRegistry(notes);

    assert.equal(classifyVideoOwnership(video, registry)?.kind, "playlist");
  });

  it("classifies playlist folder paths as playlist-owned", () => {
    const index = playlistIndex({
      slug: "playlists__death-with-shelly-kagan-index",
      title: "Death With Shelly Kagan Index",
      metadata: { playlist: "Death with Shelly Kagan" },
    });
    const video = playlistVideo(
      {
        slug: "lesson-1",
        title: "Lesson 1",
        fileId: "lesson-1-file",
      },
      "Death with Shelly Kagan",
    );
    const notes = [index, video];
    const registry = buildPlaylistOwnershipRegistry(notes);

    const ownership = classifyVideoOwnership(video, registry);

    assert.equal(ownership?.kind, "playlist");
    assert.equal(ownership?.playlistTitle, "Death with Shelly Kagan");
  });

  it("classifies matched YouTube video IDs as playlist-owned", () => {
    const index = playlistIndex({
      slug: "playlists__great-art-explained-index",
      title: "Great Art Explained Index",
      metadata: { playlist: "Great Art Explained" },
    });
    const video = playlistVideo(
      {
        slug: "episode-1",
        title: "Episode 1",
        metadata: {
          video_url: "https://www.youtube.com/watch?v=abc123XYZ01",
        },
      },
      "Great Art Explained",
    );
    const notes = [index, video];
    const registry = buildPlaylistOwnershipRegistry(notes);
    const ownership = classifyVideoOwnership(video, registry);

    assert.equal(ownership?.kind, "playlist");
    assert.equal(
      registry.byVideoId.get("abc123XYZ01")?.title,
      "Great Art Explained",
    );
  });

  it("classifies videos without playlist ownership as standalone", () => {
    const video = noteSummary({
      slug: "videos__solo",
      title: "Solo",
      subfolderLabel: "videos",
      relativePath: "videos/solo.md",
    });
    const registry = buildPlaylistOwnershipRegistry([]);

    assert.equal(classifyVideoOwnership(video, registry)?.kind, "standalone");
    assert.equal(isStandaloneYoutubeVideo(video, [video]), true);
  });

  it("excludes playlist-owned videos from Recently added", () => {
    const index = playlistIndex({
      slug: "playlists__justice-index",
      title: "Justice Index",
      metadata: { playlist: "Justice" },
    });
    const playlistNote = noteSummary({
      slug: "videos__lecture-1",
      title: "Lecture 1",
      subfolderLabel: "videos",
      relativePath: "videos/lecture-1.md",
      metadata: { playlist: "Justice" },
      dateLabel: "Jul 10, 2026",
    });
    const standalone = noteSummary({
      slug: "videos__solo",
      title: "Solo",
      subfolderLabel: "videos",
      relativePath: "videos/solo.md",
      dateLabel: "Jul 9, 2026",
    });

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: [index, playlistNote, standalone],
      groups: [],
      hasActiveQuery: false,
    });

    const recentBlock = view.blocks.find((block) => block.kind === "recently-added");

    assert.equal(recentBlock?.kind, "recently-added");
    assert.equal(recentBlock.notes.length, 1);
    assert.equal(recentBlock.notes[0]?.slug, "videos__solo");
  });

  it("excludes playlist-owned videos from standalone channel groups", () => {
    const index = playlistIndex({
      slug: "playlists__justice-index",
      title: "Justice Index",
      metadata: { playlist: "Justice", channel: "YaleCourses" },
    });
    const playlistNote = noteSummary({
      slug: "videos__lecture-1",
      title: "Lecture 1",
      subfolderLabel: "videos",
      relativePath: "videos/lecture-1.md",
      metadata: { playlist: "Justice", channel: "YaleCourses" },
    });
    const standalone = noteSummary({
      slug: "videos__solo",
      title: "Solo",
      subfolderLabel: "videos",
      relativePath: "videos/solo.md",
      metadata: { channel: "YaleCourses" },
    });

    const view = buildLifeLabSectionView({
      sectionId: "youtube-learning",
      notes: [index, playlistNote, standalone],
      groups: [],
      hasActiveQuery: false,
    });

    const standaloneBlock = view.blocks.find(
      (block) => block.kind === "standalone-videos",
    );

    assert.equal(standaloneBlock?.kind, "standalone-videos");
    assert.equal(standaloneBlock.totalCount, 1);
    assert.equal(standaloneBlock.channelGroups[0]?.notes[0]?.slug, "videos__solo");
  });

  it("does not classify unresolved playlist membership as standalone", () => {
    const index = playlistIndex({
      slug: "playlists__broken-index",
      title: "Broken Playlist Index",
      metadata: { playlist: "Broken Playlist" },
      excerpt: "0 processed · 12 pending · 0 errors",
    });
    const orphan = noteSummary({
      slug: "broken__orphan-1",
      title: "Orphan 1",
      subfolderLabel: "broken",
      relativePath: "broken/orphan-1.md",
    });
    const classifier = createYoutubeLibraryClassifier([index]);

    assert.equal(classifier.classifyRole(orphan), "unresolved-playlist-video");
    assert.equal(isStandaloneYoutubeVideo(orphan, [index]), false);
  });

  it("dedupes duplicate video IDs when building library keys", () => {
    const note = noteSummary({
      slug: "videos__one",
      title: "One",
      fileId: "",
      relativePath: "videos/one.md",
      metadata: {
        youtubeVideoId: "abc123XYZ01",
      },
    });

    assert.equal(noteLibraryDedupeKey(note), "yt:abc123XYZ01");
  });

  it("keeps playlist-owned videos available to playlist grouping/search", () => {
    const index = playlistIndex({
      slug: "playlists__justice-index",
      title: "Justice Index",
      metadata: { playlist: "Justice" },
    });
    const video = noteSummary({
      slug: "videos__lecture-1",
      title: "Arguments for the Soul, Part I",
      subfolderLabel: "videos",
      relativePath: "videos/lecture-1.md",
      metadata: { playlist: "Justice" },
    });
    const classifier = createYoutubeLibraryClassifier([index, video]);
    const ownership = classifier.classifyOwnership(video);

    assert.equal(ownership?.kind, "playlist");
    assert.equal(ownership?.playlistTitle, "Justice");
  });
});
