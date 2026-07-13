import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  categorizePlaybackFailure,
  classifyAudioSrc,
  clearAudioSource,
  looksLikeMp3,
  mapMediaErrorCode,
  normalizeNarrationAudioBlob,
  replaceAudioObjectUrl,
  validateNarrationAudioBlob,
} from "@/lib/life-lab/narration-playback";

describe("looksLikeMp3", () => {
  it("detects ID3 and frame-sync MP3 headers", () => {
    assert.equal(looksLikeMp3(new Uint8Array([0x49, 0x44, 0x33])), true);
    assert.equal(looksLikeMp3(new Uint8Array([0xff, 0xfb, 0x90])), true);
    assert.equal(looksLikeMp3(new Uint8Array([0x7b, 0x22, 0x65])), false);
  });
});

describe("validateNarrationAudioBlob", () => {
  it("returns empty_audio_response for zero-byte blobs", () => {
    assert.equal(
      validateNarrationAudioBlob(new Blob([], { type: "audio/mpeg" })),
      "empty_audio_response",
    );
  });

  it("accepts audio/mpeg blobs", () => {
    assert.equal(
      validateNarrationAudioBlob(
        new Blob([new Uint8Array([0xff, 0xfb])], { type: "audio/mpeg" }),
      ),
      null,
    );
  });
});

describe("normalizeNarrationAudioBlob", () => {
  it("fills missing blob type from response Content-Type", () => {
    const blob = normalizeNarrationAudioBlob(
      new Blob([new Uint8Array([1, 2, 3])]),
      "audio/mpeg",
    );

    assert.equal(blob.type, "audio/mpeg");
  });
});

describe("categorizePlaybackFailure", () => {
  it("maps NotAllowedError to playback_requires_user_gesture", () => {
    assert.equal(
      categorizePlaybackFailure({
        playError: new DOMException("play blocked", "NotAllowedError"),
      }),
      "playback_requires_user_gesture",
    );
  });

  it("maps media error codes to specific categories", () => {
    assert.equal(
      mapMediaErrorCode(3),
      "audio_decode_failure",
    );
    assert.equal(
      categorizePlaybackFailure({
        mediaError: { code: 2 } as MediaError,
      }),
      "audio_network_failure",
    );
  });
});

describe("classifyAudioSrc", () => {
  it("classifies blob, data, and remote sources", () => {
    assert.equal(classifyAudioSrc("blob:https://planlet.test/abc"), "blob");
    assert.equal(classifyAudioSrc("data:audio/mpeg;base64,abc"), "data");
    assert.equal(classifyAudioSrc("https://example.com/audio.mp3"), "remote");
  });
});

describe("object URL lifecycle helpers", () => {
  it("replaceAudioObjectUrl revokes the previous URL once", () => {
    const revoked: string[] = [];
    const originalRevoke = URL.revokeObjectURL;

    URL.revokeObjectURL = (url: string) => {
      revoked.push(url);
    };

    try {
      const audio = {
        pause: () => undefined,
        load: () => undefined,
        src: "",
      } as HTMLAudioElement;
      const activeUrlRef = { current: "blob:old" as string | null };

      replaceAudioObjectUrl({
        audio,
        nextUrl: "blob:new",
        activeUrlRef,
      });

      assert.deepEqual(revoked, ["blob:old"]);
      assert.equal(activeUrlRef.current, "blob:new");
      assert.equal(audio.src, "blob:new");
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it("clearAudioSource revokes the active URL", () => {
    const revoked: string[] = [];
    const originalRevoke = URL.revokeObjectURL;

    URL.revokeObjectURL = (url: string) => {
      revoked.push(url);
    };

    try {
      const audio = {
        pause: () => undefined,
        load: () => undefined,
        removeAttribute: () => undefined,
        src: "blob:active",
      } as HTMLAudioElement;

      clearAudioSource({
        audio,
        activeUrlRef: { current: "blob:active" },
      });

      assert.deepEqual(revoked, ["blob:active"]);
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
