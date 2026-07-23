import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  beginLifeLabCacheMiss,
  buildLifeLabRequestSummary,
  finishLifeLabCacheLookup,
  getLifeLabRequestTelemetrySnapshot,
  runLifeLabRequestTelemetry,
  setLifeLabRequestMeta,
} from "@/lib/life-lab/cache-telemetry";
import {
  resetLifeLabLogLevelForTests,
  setLifeLabLogLevelForTests,
} from "@/lib/life-lab/log-level";
import {
  buildPlaylistNavigationFromVideoNotes,
  findPlaylistIndexSlugByMetadata,
} from "@/lib/life-lab/playlist-index";
import { lifeLabNotePayloadCacheKey } from "@/lib/life-lab/cache";

describe("Life Lab note-open performance wiring", () => {
  const root = join(import.meta.dirname, "../..");

  beforeEach(() => {
    setLifeLabLogLevelForTests("off");
  });

  afterEach(() => {
    resetLifeLabLogLevelForTests();
  });

  it("sets route meta so summaries never report route: null for notes", async () => {
    await runLifeLabRequestTelemetry(
      async () => {
        setLifeLabRequestMeta({
          route: "/life-lab/youtube-learning/videos__example",
          sectionId: "youtube-learning",
          noteSlug: "videos__example",
          noteId: "file-1",
          cacheKey: lifeLabNotePayloadCacheKey("file-1"),
          navigationSource: "note-detail",
        });

        const snapshot = getLifeLabRequestTelemetrySnapshot();
        assert.ok(snapshot);
        const summary = buildLifeLabRequestSummary(snapshot!);
        assert.equal(
          summary.route,
          "/life-lab/youtube-learning/videos__example",
        );
        assert.equal(summary.sectionId, "youtube-learning");
        assert.equal(summary.noteId, "file-1");
        assert.equal(summary.noteSlug, "videos__example");
        assert.equal(summary.cacheKey, lifeLabNotePayloadCacheKey("file-1"));
        assert.equal(summary.navigationSource, "note-detail");
        assert.notEqual(summary.route, null);
      },
      {
        meta: {
          route: "/life-lab/youtube-learning/videos__example",
          sectionId: "youtube-learning",
        },
      },
    );

    const noteLoader = readFileSync(join(root, "lib/life-lab.ts"), "utf8");
    assert.match(noteLoader, /setLifeLabRequestMeta\(\{\s*route:/);
    assert.match(noteLoader, /navigationSource/);
    assert.match(noteLoader, /cacheKey: lifeLabNotePayloadCacheKey/);
  });

  it("dedupes note loads within one request via React cache()", () => {
    const source = readFileSync(join(root, "lib/life-lab.ts"), "utf8");
    assert.match(source, /import \{ cache \} from "react"/);
    assert.match(source, /const getLifeLabNoteDataCached = cache\(/);
    assert.match(source, /const getNoteContentCachedDeduped = cache\(/);
  });

  it("does not load every playlist index payload for note navigation", () => {
    const source = readFileSync(join(root, "lib/life-lab.ts"), "utf8");
    assert.match(source, /findPlaylistIndexSlugByMetadata/);
    assert.match(source, /getYoutubeVideoPlaylistNavigationLightweight/);
    assert.doesNotMatch(
      source,
      /for \(const record of playlistIndexRecords\) \{\s*const playlistNote = await getNoteContentCached/,
    );

    const page = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );
    assert.match(page, /getYoutubeVideoPlaylistNavigationLightweight/);
    assert.match(page, /LifeLabNotePlaylistNavSlot/);
    assert.match(page, /<Suspense/);
    assert.doesNotMatch(page, /await getYoutubeVideoPlaylistNavigation\(/);
  });

  it("resolves playlist ownership from lightweight metadata without payloads", () => {
    const records = [
      {
        slug: "playlists__great-library",
        title: "Great Library Series",
        relativePath: "playlists/great-library/playlist-index.md",
        subfolderLabel: "playlists",
        metadata: { type: "playlist-index", playlist: "Great Library Series" },
      },
      {
        slug: "videos__alexandria",
        title: "The Great Library of Alexandria",
        relativePath: "videos/alexandria.md",
        subfolderLabel: "videos",
        metadata: {
          type: "youtube-video",
          playlist: "Great Library Series",
          episode: 1,
        },
      },
      {
        slug: "videos__other",
        title: "Other video",
        relativePath: "videos/other.md",
        subfolderLabel: "videos",
        metadata: {
          type: "youtube-video",
          playlist: "Great Library Series",
          episode: 2,
        },
      },
    ];

    const indexSlug = findPlaylistIndexSlugByMetadata(
      records as never,
      records[1] as never,
    );
    assert.equal(indexSlug, "playlists__great-library");

    const nav = buildPlaylistNavigationFromVideoNotes(
      records as never,
      records[1] as never,
      "youtube-learning",
    );
    assert.ok(nav);
    assert.equal(
      nav!.playlistIndexHref,
      "/life-lab/youtube-learning/playlists__great-library",
    );
    assert.ok(nav!.previous || nav!.next);
    const siblingHref = nav!.previous?.href ?? nav!.next?.href ?? "";
    assert.match(siblingHref, /videos__other/);
  });

  it("renders a calm route-level loading skeleton", () => {
    const loading = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/loading.tsx"),
      "utf8",
    );
    assert.match(loading, /data-life-lab-note-loading/);
    assert.match(loading, /aspect-video/);
    assert.match(loading, /animate-pulse/);
    assert.doesNotMatch(loading, /spinner|Spinner|Loading\.\.\./i);
  });

  it("uses prefetch-capable note Links from listing cards", () => {
    const videoRow = readFileSync(
      join(root, "components/life-lab/life-lab-video-row.tsx"),
      "utf8",
    );
    const sectionNotes = readFileSync(
      join(root, "components/life-lab/life-lab-section-notes.tsx"),
      "utf8",
    );

    assert.match(videoRow, /prefetch/);
    assert.match(videoRow, /data-life-lab-note-link/);
    assert.match(sectionNotes, /data-life-lab-note-link/);
    assert.match(sectionNotes, /prefetch/);
  });

  it("keeps note payload cache keys stable without timestamps", () => {
    const key = lifeLabNotePayloadCacheKey("drive-file-abc");
    assert.equal(key, lifeLabNotePayloadCacheKey("drive-file-abc"));
    assert.doesNotMatch(key, /\d{10,}/);
    assert.doesNotMatch(key, /Math\.random|Date\.now|uuid/i);
    assert.match(key, /^life-lab-note-payload:/);
  });

  it("tracks warm note opens as note payload hits with zero Drive calls", async () => {
    await runLifeLabRequestTelemetry(async () => {
      finishLifeLabCacheLookup({
        type: "folder-map",
        key: "life-lab-section-folder-map:v3-flashcards",
        durationMs: 1,
      });
      finishLifeLabCacheLookup({
        type: "section",
        key: "life-lab-section-file-index:v9-flashcards:youtube-learning",
        durationMs: 1,
      });
      finishLifeLabCacheLookup({
        type: "note",
        key: lifeLabNotePayloadCacheKey("file-warm"),
        durationMs: 1,
      });

      const snapshot = getLifeLabRequestTelemetrySnapshot();
      assert.ok(snapshot);
      const summary = buildLifeLabRequestSummary(snapshot!);
      assert.equal(summary.notePayloadHits, 1);
      assert.equal(summary.notePayloadMisses, 0);
      assert.equal(summary.driveCalls, 0);
      assert.equal(summary.cacheMisses, 0);
    });
  });

  it("does not invalidate caches during ordinary note render wiring", () => {
    const page = readFileSync(
      join(root, "app/(app)/life-lab/[section]/[slug]/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(page, /invalidateLifeLab|revalidateTag|refreshLifeLab/);
    beginLifeLabCacheMiss({ type: "note", key: "unused" });
  });
});
