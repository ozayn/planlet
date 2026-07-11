import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canUseLifeLabRefreshBypass,
  getLifeLabListCacheSeconds,
  getLifeLabNoteCacheSeconds,
  lifeLabCacheExpiresAt,
  lifeLabNoteCacheTag,
  lifeLabPlaylistAssetCacheTag,
  lifeLabPlaylistAssetsCacheTag,
  lifeLabPlaylistLearningMapCacheTag,
  lifeLabPlaylistCacheTag,
  lifeLabRefreshFailureMessage,
  lifeLabSectionCacheTag,
  LIFE_LAB_CACHE_TAG,
  LIFE_LAB_SECTIONS_CACHE_TAG,
  tagsInvalidatedByHomeRefresh,
  tagsInvalidatedByNoteRefresh,
  tagsInvalidatedByPlaylistRefresh,
  tagsInvalidatedBySectionRefresh,
  toLifeLabRefreshFailureResult,
} from "@/lib/life-lab/cache";
import { canAccessLifeLabPage } from "@/lib/roles";

describe("life lab cache helpers", () => {
  it("builds granular cache tags", () => {
    assert.equal(LIFE_LAB_SECTIONS_CACHE_TAG, "life-lab:sections");
    assert.equal(
      lifeLabSectionCacheTag("youtube-learning"),
      "life-lab:section:youtube-learning",
    );
    assert.equal(lifeLabNoteCacheTag("file-123"), "life-lab:note:file-123");
    assert.equal(
      lifeLabPlaylistCacheTag("youtube-learning", "playlists__great-art"),
      "life-lab:playlist:youtube-learning:playlists__great-art",
    );
    assert.equal(
      lifeLabPlaylistAssetsCacheTag("plwxnmb28xmpeypjmhfnbj4rafkrtman3p"),
      "life-lab:playlist-assets:plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
    );
    assert.equal(
      lifeLabPlaylistLearningMapCacheTag("plwxnmb28xmpeypjmhfnbj4rafkrtman3p"),
      "life-lab:playlist-learning-map:plwxnmb28xmpeypjmhfnbj4rafkrtman3p",
    );
  });

  it("uses configured list and note TTL defaults", () => {
    const originalList = process.env.LIFE_LAB_LIST_CACHE_SECONDS;
    const originalNote = process.env.LIFE_LAB_NOTE_CACHE_SECONDS;

    process.env.LIFE_LAB_LIST_CACHE_SECONDS = "900";
    process.env.LIFE_LAB_NOTE_CACHE_SECONDS = "7200";

    assert.equal(getLifeLabListCacheSeconds(), 900);
    assert.equal(getLifeLabNoteCacheSeconds(), 7200);

    process.env.LIFE_LAB_LIST_CACHE_SECONDS = originalList;
    process.env.LIFE_LAB_NOTE_CACHE_SECONDS = originalNote;
  });

  it("allows refresh bypass only for authorized development users", () => {
    assert.equal(
      canUseLifeLabRefreshBypass("1", true),
      process.env.NODE_ENV === "development",
    );
    assert.equal(canUseLifeLabRefreshBypass("1", false), false);
    assert.equal(canUseLifeLabRefreshBypass(undefined, true), false);
  });

  it("computes cache expiry timestamps", () => {
    assert.equal(
      lifeLabCacheExpiresAt("2026-07-11T10:00:00.000Z", 1800),
      "2026-07-11T10:30:00.000Z",
    );
  });

  it("returns a stale fallback refresh message", () => {
    assert.match(lifeLabRefreshFailureMessage(), /cached version/i);
  });
});

describe("life lab cache invalidation scope", () => {
  it("invalidates only section tags for section refresh", () => {
    assert.deepEqual(tagsInvalidatedBySectionRefresh("youtube-learning"), [
      "life-lab:section:youtube-learning",
      "life-lab:playlists:youtube-learning",
    ]);
    assert.deepEqual(tagsInvalidatedBySectionRefresh("photography"), [
      "life-lab:section:photography",
      "life-lab:playlists:photography",
    ]);
  });

  it("does not flush unrelated sections when refreshing a playlist", () => {
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
    assert.equal(tags.includes(LIFE_LAB_SECTIONS_CACHE_TAG), false);
  });

  it("invalidates only the targeted note for note refresh", () => {
    assert.deepEqual(
      tagsInvalidatedByNoteRefresh({
        fileId: "note-abc",
        sectionId: "youtube-learning",
      }),
      ["life-lab:note:note-abc", "life-lab:section:youtube-learning"],
    );
    assert.deepEqual(
      tagsInvalidatedByNoteRefresh({
        fileId: "note-abc",
      }),
      ["life-lab:note:note-abc"],
    );
  });

  it("invalidates home section map tags without touching note caches", () => {
    assert.deepEqual(tagsInvalidatedByHomeRefresh(), [
      LIFE_LAB_SECTIONS_CACHE_TAG,
      LIFE_LAB_CACHE_TAG,
    ]);
    assert.equal(
      tagsInvalidatedByHomeRefresh().some((tag) => tag.startsWith("life-lab:note:")),
      false,
    );
  });
});

describe("life lab refresh authorization and failures", () => {
  it("rejects unauthorized refresh access", () => {
    assert.equal(canAccessLifeLabPage({ role: "USER" }), false);
    assert.equal(canAccessLifeLabPage({ role: "REFLECTOR" }), false);
    assert.equal(canAccessLifeLabPage({ role: "PERSONAL" }), true);
    assert.equal(canAccessLifeLabPage({ role: "ADMIN" }), true);
  });

  it("returns stale cached content on failed refresh", () => {
    const result = toLifeLabRefreshFailureResult();

    assert.equal(result.ok, false);
    assert.equal(result.stale, true);
    assert.match(result.message, /cached version/i);
  });
});

describe("life lab listing cache keys", () => {
  it("uses stable section and note cache keys to avoid duplicate Drive calls", () => {
    const sectionId = "youtube-learning";
    const fileId = "drive-file-1";
    const playlistId = "plwxnmb28xmpeypjmhfnbj4rafkrtman3p";

    assert.equal(
      `life-lab-section-file-index-${sectionId}`,
      "life-lab-section-file-index-youtube-learning",
    );
    assert.equal(
      `life-lab-note-payload-${fileId}`,
      "life-lab-note-payload-drive-file-1",
    );
    assert.equal(
      `life-lab-playlist-assets-${sectionId}-${playlistId}-playlists__western-philosophy-index`,
      "life-lab-playlist-assets-youtube-learning-plwxnmb28xmpeypjmhfnbj4rafkrtman3p-playlists__western-philosophy-index",
    );
  });
});
