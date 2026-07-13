import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSameOriginNarrationChunkUrl,
  buildSameOriginNarrationTestUrl,
  categorizeMediaErrorMessage,
  isSafeNarrationAudioSource,
  parseNarrationAudioSourceScheme,
  validateAssignableAudioSource,
} from "@/lib/life-lab/narration-audio-source";

describe("parseNarrationAudioSourceScheme", () => {
  it("classifies blob, https, data, and empty sources", () => {
    assert.equal(parseNarrationAudioSourceScheme("blob:https://planlet.test/abc"), "blob");
    assert.equal(parseNarrationAudioSourceScheme("https://example.com/a.mp3"), "https");
    assert.equal(parseNarrationAudioSourceScheme("/api/life-lab/narration/test"), "https");
    assert.equal(parseNarrationAudioSourceScheme("data:audio/mpeg;base64,abc"), "data");
    assert.equal(parseNarrationAudioSourceScheme(""), "empty");
    assert.equal(parseNarrationAudioSourceScheme("undefined"), "empty");
  });
});

describe("isSafeNarrationAudioSource", () => {
  it("accepts blob and same-origin routes", () => {
    assert.equal(isSafeNarrationAudioSource("blob:https://planlet.test/abc"), true);
    assert.equal(
      isSafeNarrationAudioSource("/api/life-lab/narration/chunk?sectionId=a&slug=b&chunkIndex=0"),
      true,
    );
    assert.equal(
      isSafeNarrationAudioSource("https://planlet.test/api/life-lab/narration/test", {
        pageOrigin: "https://planlet.test",
      }),
      true,
    );
  });

  it("rejects javascript, data, and malformed sources", () => {
    assert.equal(isSafeNarrationAudioSource("javascript:alert(1)"), false);
    assert.equal(isSafeNarrationAudioSource("data:audio/mpeg;base64,abc"), false);
    assert.equal(isSafeNarrationAudioSource("[object Object]"), false);
    assert.equal(isSafeNarrationAudioSource("ftp://example.com/a.mp3"), false);
  });

  it("accepts trusted storage hosts", () => {
    assert.equal(
      isSafeNarrationAudioSource("https://storage.example.com/audio.mp3", {
        trustedStorageHosts: ["storage.example.com"],
      }),
      true,
    );
  });
});

describe("validateAssignableAudioSource", () => {
  it("rejects empty and object-like strings", () => {
    assert.equal(validateAssignableAudioSource(""), "empty_audio_source");
    assert.equal(validateAssignableAudioSource("null"), "empty_audio_source");
    assert.equal(validateAssignableAudioSource("[object Object]"), "empty_audio_source");
    assert.equal(validateAssignableAudioSource({} as unknown as string), "empty_audio_source");
  });
});

describe("categorizeMediaErrorMessage", () => {
  it("maps URL safety check failures to CSP/blob categories", () => {
    assert.equal(
      categorizeMediaErrorMessage(
        "MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check",
        "blob",
      ),
      "audio_csp_blocked",
    );
    assert.equal(
      categorizeMediaErrorMessage(
        "Media load rejected by URL safety check",
        "https",
      ),
      "unsafe_audio_url",
    );
  });
});

describe("same-origin narration URLs", () => {
  it("builds chunk and test routes without double-encoding", () => {
    assert.equal(
      buildSameOriginNarrationChunkUrl({
        sectionId: "section id",
        slug: "note-slug",
        chunkIndex: 2,
      }),
      "/api/life-lab/narration/chunk?sectionId=section+id&slug=note-slug&chunkIndex=2",
    );
    assert.equal(buildSameOriginNarrationTestUrl(), "/api/life-lab/narration/test");
  });
});
