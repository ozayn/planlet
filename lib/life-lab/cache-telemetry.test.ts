import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  lifeLabNotePayloadCacheKey,
  lifeLabPlaylistAssetsBundleCacheKey,
  lifeLabSectionFileIndexCacheKey,
  tagsInvalidatedByNoteRefresh,
  tagsInvalidatedByPlaylistRefresh,
  tagsInvalidatedBySectionRefresh,
} from "@/lib/life-lab/cache";
import {
  beginLifeLabCacheMiss,
  buildLifeLabCacheDiagnostic,
  canViewLifeLabCacheDiagnostics,
  finishLifeLabCacheLookup,
  getLifeLabCacheResult,
  logLifeLabCacheEvent,
  redactLifeLabCacheLogForTests,
  runLifeLabRequestTelemetry,
} from "@/lib/life-lab/cache-telemetry";

describe("life lab cache telemetry", () => {
  it("tracks cache miss and hit within a request scope", async () => {
    await runLifeLabRequestTelemetry(async () => {
      beginLifeLabCacheMiss({
        type: "section",
        key: "life-lab-section-file-index:v5-standalone-series:youtube-learning",
      });

      const miss = getLifeLabCacheResult(
        "section",
        "life-lab-section-file-index:v5-standalone-series:youtube-learning",
      );
      assert.equal(miss, "miss");

      const result = finishLifeLabCacheLookup({
        type: "section",
        key: "life-lab-section-file-index:v5-standalone-series:youtube-learning",
        durationMs: 12,
      });

      assert.equal(result, "miss");
    });
  });

  it("records cache hit when loader callback did not run", async () => {
    await runLifeLabRequestTelemetry(async () => {
      const result = finishLifeLabCacheLookup({
        type: "note",
        key: "life-lab-note-payload:v4-youtube-thumbnails:file-1",
        durationMs: 4,
      });

      assert.equal(result, "hit");
      assert.equal(
        getLifeLabCacheResult(
          "note",
          "life-lab-note-payload:v4-youtube-thumbnails:file-1",
        ),
        "hit",
      );
    });
  });

  it("builds diagnostics without secrets or note content", async () => {
    const diagnostic = await runLifeLabRequestTelemetry(async () => {
      beginLifeLabCacheMiss({
        type: "note",
        key: "life-lab-note-payload:v4-youtube-thumbnails:secret-file-id",
      });

      finishLifeLabCacheLookup({
        type: "note",
        key: "life-lab-note-payload:v4-youtube-thumbnails:secret-file-id",
        durationMs: 8,
      });

      return buildLifeLabCacheDiagnostic({
        type: "note",
        key: "life-lab-note-payload:v4-youtube-thumbnails:secret-file-id",
        result: "miss",
        tags: ["life-lab:note:secret-file-id"],
        cachedAt: "2026-07-11T10:00:00.000Z",
        ttlSeconds: 30,
      });
    });

    assert.equal(diagnostic.fromCache, false);
    assert.equal(diagnostic.driveCalls, 0);
    assert.deepEqual(diagnostic.filesFetched, []);
    assert.equal(diagnostic.refreshRequested, false);
    assert.equal(
      JSON.stringify(diagnostic).includes("private-key"),
      false,
    );
  });

  it("redacts long identifiers from test logs", () => {
    const redacted = redactLifeLabCacheLogForTests({
      type: "playlist",
      key: "life-lab-playlist-assets:v2:plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
      result: "hit",
      playlistId: "plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
    });

    assert.match(redacted.key, /\[redacted\]/);
    assert.equal(redacted.playlistId, "plwxnmb28xmpeypjmhfnbj4rafkrtman3p");
  });

  it("allows diagnostics in development or for admins", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = "development";
    assert.equal(canViewLifeLabCacheDiagnostics(false), true);

    process.env.NODE_ENV = "production";
    assert.equal(canViewLifeLabCacheDiagnostics(false), false);
    assert.equal(canViewLifeLabCacheDiagnostics(true), true);

    process.env.NODE_ENV = originalNodeEnv;
  });

  it("emits structured cache logs without secrets", () => {
    const originalInfo = console.info;
    const messages: string[] = [];

    console.info = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };

    try {
      logLifeLabCacheEvent({
        type: "section",
        key: lifeLabSectionFileIndexCacheKey("youtube-learning"),
        result: "hit",
        driveCalls: 0,
        durationMs: 18,
      });

      assert.equal(messages.length, 1);
      assert.match(messages[0] ?? "", /^\[life-lab-cache\] \{/);
      assert.equal(messages[0]?.includes("GOOGLE_SERVICE_ACCOUNT"), false);
      assert.equal(messages[0]?.includes("private_key"), false);
    } finally {
      console.info = originalInfo;
    }
  });
});

describe("life lab cache key granularity", () => {
  it("uses different cache keys for different playlists", () => {
    const playlistA = lifeLabPlaylistAssetsBundleCacheKey({
      sectionId: "youtube-learning",
      playlistId: "playlist-a",
      indexSlug: "playlists__western-philosophy-index",
    });
    const playlistB = lifeLabPlaylistAssetsBundleCacheKey({
      sectionId: "youtube-learning",
      playlistId: "playlist-b",
      indexSlug: "playlists__western-philosophy-index",
    });

    assert.notEqual(playlistA, playlistB);
  });

  it("uses the same cache key for repeated playlist loads", () => {
    const input = {
      sectionId: "youtube-learning",
      playlistId: "playlist-a",
      indexSlug: "playlists__western-philosophy-index",
    };

    assert.equal(
      lifeLabPlaylistAssetsBundleCacheKey(input),
      lifeLabPlaylistAssetsBundleCacheKey(input),
    );
  });

  it("keeps note cache separate from section listing cache", () => {
    const sectionKey = lifeLabSectionFileIndexCacheKey("youtube-learning");
    const noteKey = lifeLabNotePayloadCacheKey("drive-file-1");

    assert.notEqual(sectionKey, noteKey);
    assert.match(sectionKey, /life-lab-section-file-index/);
    assert.match(noteKey, /life-lab-note-payload/);
  });
});

describe("life lab refresh tag scope", () => {
  it("invalidates only intended tags for playlist refresh", () => {
    const tags = tagsInvalidatedByPlaylistRefresh(
      "youtube-learning",
      "playlists__great-art",
    );

    assert.deepEqual(tags, [
      "life-lab:playlist:youtube-learning:playlists__great-art",
      "life-lab:section:youtube-learning",
    ]);
    assert.equal(
      tags.some((tag) => tag === "life-lab:section:photography"),
      false,
    );
  });

  it("invalidates only the targeted note on note refresh", () => {
    const tags = tagsInvalidatedByNoteRefresh({
      fileId: "note-abc",
      sectionId: "youtube-learning",
      playlistSlug: "playlists__great-art",
    });

    assert.deepEqual(tags, [
      "life-lab:note:note-abc",
      "life-lab:section:youtube-learning",
      "life-lab:playlist:youtube-learning:playlists__great-art",
    ]);
    assert.equal(
      tags.some((tag) => tag === "life-lab:note:other-note"),
      false,
    );
  });

  it("keeps section refresh scoped to one section", () => {
    const tags = tagsInvalidatedBySectionRefresh("youtube-learning");

    assert.deepEqual(tags, [
      "life-lab:section:youtube-learning",
      "life-lab:playlists:youtube-learning",
    ]);
    assert.equal(
      tags.some((tag) => tag === "life-lab:section:photography"),
      false,
    );
  });
});
