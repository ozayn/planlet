import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNarrationErrorPayload,
  categorizeOpenAiError,
  getNarrationUserMessage,
  narrationErrorHttpStatus,
} from "@/lib/life-lab/narration-errors";
import { buildNarrationDocument } from "@/lib/life-lab/narration-text";
import { validateOpenAiTtsConfiguration } from "@/lib/env";

describe("life lab narration errors", () => {
  it("maps configuration and quota failures into safe categories", () => {
    assert.equal(
      categorizeOpenAiError(new Error("OPENAI_API_KEY is not configured")),
      "configuration_missing",
    );
    assert.equal(
      categorizeOpenAiError({ status: 401, message: "Incorrect API key provided" }),
      "authentication_failed",
    );
    assert.equal(
      categorizeOpenAiError({ status: 429, message: "Rate limit reached" }),
      "rate_limited",
    );
    assert.equal(
      categorizeOpenAiError({
        status: 402,
        message: "You exceeded your current quota",
      }),
      "insufficient_quota",
    );
  });

  it("returns user-safe messages without exposing secrets", () => {
    const payload = buildNarrationErrorPayload({
      category: "insufficient_quota",
      debugMessage: "sk-secret-should-not-leak",
      includeDebug: false,
    });

    assert.equal(
      payload.error,
      getNarrationUserMessage("insufficient_quota"),
    );
    assert.equal(payload.debugMessage, undefined);
    assert.equal(narrationErrorHttpStatus("insufficient_quota"), 503);
  });

  it("includes debug messages only when requested", () => {
    const payload = buildNarrationErrorPayload({
      category: "authentication_failed",
      debugMessage: "Incorrect API key provided",
      includeDebug: true,
    });

    assert.equal(payload.debugMessage, "Incorrect API key provided");
  });
});

describe("life lab narration configuration", () => {
  it("reports feature disabled when explicitly turned off", () => {
    const originalFlag = process.env.LIFE_LAB_OPENAI_TTS_ENABLED;
    const originalKey = process.env.OPENAI_API_KEY;

    process.env.LIFE_LAB_OPENAI_TTS_ENABLED = "false";
    process.env.OPENAI_API_KEY = "test-key";

    try {
      assert.deepEqual(validateOpenAiTtsConfiguration(), {
        ok: false,
        reason: "feature_disabled",
      });
    } finally {
      process.env.LIFE_LAB_OPENAI_TTS_ENABLED = originalFlag;
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("reports missing configuration when the API key is absent", () => {
    const originalFlag = process.env.LIFE_LAB_OPENAI_TTS_ENABLED;
    const originalKey = process.env.OPENAI_API_KEY;

    process.env.LIFE_LAB_OPENAI_TTS_ENABLED = "true";
    delete process.env.OPENAI_API_KEY;

    try {
      assert.deepEqual(validateOpenAiTtsConfiguration(), {
        ok: false,
        reason: "configuration_missing",
      });
    } finally {
      process.env.LIFE_LAB_OPENAI_TTS_ENABLED = originalFlag;
      process.env.OPENAI_API_KEY = originalKey;
    }
  });
});

describe("life lab narration titles", () => {
  it("uses the note title instead of a generic Title label", () => {
    const sections = buildNarrationDocument({
      title: "The Odyssey: Most Important Story",
      content: "## Summary\nA short overview.",
    });

    assert.equal(sections[0]?.label, "The Odyssey: Most Important Story");
    assert.equal(
      sections.some((section) => section.label === "Title"),
      false,
    );
  });

  it("skips a duplicate title section when the first heading matches", () => {
    const sections = buildNarrationDocument({
      title: "Summary",
      content: "## Summary\nAlready covered here.",
    });

    assert.equal(sections.length, 1);
    assert.equal(sections[0]?.label, "Summary");
  });
});
