import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";

import {
  beginLifeLabCacheMiss,
  buildLifeLabRequestSummary,
  finishLifeLabCacheLookup,
  logLifeLabCacheEvent,
  recordLifeLabDriveCall,
  runLifeLabRequestTelemetry,
  setLifeLabRequestMeta,
} from "@/lib/life-lab/cache-telemetry";
import {
  resetLifeLabLogLevelForTests,
  setLifeLabLogLevelForTests,
} from "@/lib/life-lab/log-level";
import {
  buildPlaylistBrowseDiagnosticEntry,
  resolveCanonicalPlaylistId,
  resolvePlaylistBrowseState,
} from "@/lib/life-lab/playlist-browse-resolution";
import { resolvePlaylistAssetsFolder } from "@/lib/life-lab/playlist-asset-resolution";

afterEach(() => {
  resetLifeLabLogLevelForTests();
});

describe("life lab log levels", () => {
  it("emits one request summary in summary mode", async () => {
    setLifeLabLogLevelForTests("summary");
    const messages: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };

    try {
      await runLifeLabRequestTelemetry(
        async () => {
          setLifeLabRequestMeta({ route: "/life-lab/youtube-learning" });
          beginLifeLabCacheMiss({
            type: "note",
            key: "life-lab-note-payload:file-1",
          });
          finishLifeLabCacheLookup({
            type: "note",
            key: "life-lab-note-payload:file-1",
            durationMs: 3,
          });
          finishLifeLabCacheLookup({
            type: "note",
            key: "life-lab-note-payload:file-2",
            durationMs: 1,
          });
          recordLifeLabDriveCall("download", "file-1");
        },
        { meta: { route: "/life-lab/youtube-learning" } },
      );
    } finally {
      console.info = originalInfo;
    }

    const summaries = messages.filter((line) =>
      line.startsWith("[life-lab-summary]"),
    );
    const verbose = messages.filter((line) =>
      line.startsWith("[life-lab-cache]"),
    );

    assert.equal(summaries.length, 1);
    assert.equal(verbose.length, 0);
    assert.match(summaries[0] ?? "", /"cacheHits":1/);
    assert.match(summaries[0] ?? "", /"cacheMisses":1/);
    assert.match(summaries[0] ?? "", /"driveCalls":1/);
  });

  it("emits detailed cache entries in verbose mode", async () => {
    setLifeLabLogLevelForTests("verbose");
    const messages: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };

    try {
      await runLifeLabRequestTelemetry(async () => {
        beginLifeLabCacheMiss({
          type: "note",
          key: "life-lab-note-payload:file-3",
        });
        finishLifeLabCacheLookup({
          type: "note",
          key: "life-lab-note-payload:file-3",
          durationMs: 2,
        });
      });
    } finally {
      console.info = originalInfo;
    }

    assert.ok(
      messages.some((line) => line.startsWith("[life-lab-cache]")),
      "expected verbose cache lines",
    );
    assert.ok(
      messages.some((line) => line.startsWith("[life-lab-summary]")),
      "expected summary line",
    );
  });

  it("emits nothing in off mode", async () => {
    setLifeLabLogLevelForTests("off");
    const messages: string[] = [];
    const originalInfo = console.info;
    const originalError = console.error;
    console.info = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };
    console.error = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };

    try {
      await runLifeLabRequestTelemetry(async () => {
        beginLifeLabCacheMiss({
          type: "note",
          key: "life-lab-note-payload:file-4",
        });
        logLifeLabCacheEvent({
          type: "note",
          key: "life-lab-note-payload:file-4",
          result: "miss",
        });
      });
    } finally {
      console.info = originalInfo;
      console.error = originalError;
    }

    assert.equal(messages.length, 0);
  });

  it("keeps error mode quiet for successful cache traffic", async () => {
    setLifeLabLogLevelForTests("error");
    const messages: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    };

    try {
      await runLifeLabRequestTelemetry(async () => {
        finishLifeLabCacheLookup({
          type: "note",
          key: "life-lab-note-payload:file-5",
          durationMs: 1,
        });
      });
    } finally {
      console.info = originalInfo;
    }

    assert.equal(messages.length, 0);
  });
});

describe("life lab request summary aggregation", () => {
  it("counts note hits and misses without listing each key", async () => {
    await runLifeLabRequestTelemetry(async () => {
      beginLifeLabCacheMiss({ type: "note", key: "n1" });
      finishLifeLabCacheLookup({ type: "note", key: "n1", durationMs: 1 });
      finishLifeLabCacheLookup({ type: "note", key: "n2", durationMs: 1 });
      finishLifeLabCacheLookup({
        type: "section",
        key: "section-index",
        durationMs: 1,
      });

      const snapshot = (
        await import("@/lib/life-lab/cache-telemetry")
      ).getLifeLabRequestTelemetrySnapshot();
      assert.ok(snapshot);
      const summary = buildLifeLabRequestSummary(snapshot!);
      assert.equal(summary.notePayloadHits, 1);
      assert.equal(summary.notePayloadMisses, 1);
      assert.equal(summary.cacheHits, 2);
      assert.equal(summary.cacheMisses, 1);
      assert.equal(summary.sectionIndex, "hit");
    });
  });
});

describe("playlist identity consistency", () => {
  it("resolves the same playlistId for browse diagnostics and assets", () => {
    const playlistId = "pljbktetmtwcqi2pxrd9zsdffsr4nq5u";
    const indexNote = {
      slug: "playlists__great-art-explained",
      title: "Great Art Explained",
      excerpt: "12 processed",
      modifiedAt: null,
      modifiedAtLabel: null,
      dateLabel: null,
      subfolderLabel: "playlists",
      fileId: "index-file-1",
      relativePath: "playlists/Great Art Explained.md",
      metadata: undefined,
    };
    const body = `## Assets\n\n[Learning map](assets/${playlistId}/learning-map.md)\n`;
    const records = [
      {
        slug: "assets__playlist",
        title: "asset",
        excerpt: "",
        modifiedAt: null,
        modifiedAtLabel: null,
        dateLabel: null,
        subfolderLabel: "assets",
        fileId: "asset-folder-marker",
        relativePath: `playlists/assets/${playlistId}/learning-map.md`,
        mimeType: null,
        fileSizeBytes: null,
      },
    ];

    const folder = resolvePlaylistAssetsFolder({ indexNote, records, body });
    const browse = buildPlaylistBrowseDiagnosticEntry({
      sectionId: "youtube-learning",
      indexNote,
      resolution: resolvePlaylistBrowseState({
        sectionId: "youtube-learning",
        indexNote,
        allNotes: [indexNote],
      }),
      records,
      body,
    });
    const canonical = resolveCanonicalPlaylistId({ indexNote, records, body });

    assert.equal(folder.status, "resolved");
    if (folder.status === "resolved") {
      assert.equal(folder.playlistId, playlistId);
    }
    assert.equal(browse.playlistId, playlistId);
    assert.equal(canonical.playlistId, playlistId);
    assert.equal(canonical.assetPath, `playlists/assets/${playlistId}`);
  });
});
