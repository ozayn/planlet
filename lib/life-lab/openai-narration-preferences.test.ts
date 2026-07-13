import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  NARRATION_INSTRUCTION_VERSION,
  OPENAI_NARRATION_STYLES,
} from "@/lib/life-lab/narration-config";
import {
  DEFAULT_OPENAI_NARRATION_PREFERENCES,
  getNarrationPreviewText,
  resolveNarrationInstructions,
  resolveOpenAiNarrationSettings,
  resolveOpenAiNarrationVoice,
} from "@/lib/life-lab/openai-narration-preferences";

describe("open ai narration preferences", () => {
  it("defaults to British female calm with marin-friendly server voice fallback", () => {
    assert.equal(
      DEFAULT_OPENAI_NARRATION_PREFERENCES.narrationStyle,
      "BRITISH_FEMALE_CALM",
    );
    assert.match(
      resolveNarrationInstructions({
        narrationStyle: "BRITISH_FEMALE_CALM",
      }),
      /British female voice/i,
    );
    assert.match(
      resolveNarrationInstructions({
        narrationStyle: "BRITISH_FEMALE_CALM",
      }),
      /philosophy, privacy, controversy, and schedule/i,
    );
  });

  it("appends mixed-language guidance without rewriting note text", () => {
    const instructions = resolveNarrationInstructions({
      narrationStyle: "BRITISH_FEMALE_CALM",
    });

    assert.match(instructions, /Persian/);
    assert.match(instructions, /preserve the original language/i);
  });

  it("uses the representative preview paragraph", () => {
    assert.match(getNarrationPreviewText(), /Personal identity asks/);
  });

  it("falls back unsupported voices with a warning instead of silently changing mid-note resolution", () => {
    const resolved = resolveOpenAiNarrationVoice({
      userVoice: "not-a-real-voice",
      serverDefault: "marin",
    });

    assert.equal(resolved.voice, "marin");
    assert.ok(resolved.voiceWarning);
  });

  it("changes cache keys when voice or style changes", () => {
    const base = {
      driveFileId: "file-1",
      noteModifiedTime: "2026-07-11T10:00:00.000Z",
      contentHash: hashNarrationContent("hello"),
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      chunkIndex: 0,
    };

    const british = resolveOpenAiNarrationSettings({
      voice: "marin",
      narrationStyle: "BRITISH_FEMALE_CALM",
      customNarrationInstructions: null,
    });
    const neutral = resolveOpenAiNarrationSettings({
      voice: "marin",
      narrationStyle: "NEUTRAL_EDUCATIONAL",
      customNarrationInstructions: null,
    });

    const britishKey = buildNarrationCacheKey({
      ...base,
      voice: british.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      instructionsFingerprint: british.instructionsFingerprint,
    });
    const neutralKey = buildNarrationCacheKey({
      ...base,
      voice: neutral.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.slug,
      instructionsFingerprint: neutral.instructionsFingerprint,
    });
    const shimmerKey = buildNarrationCacheKey({
      ...base,
      voice: "shimmer",
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      instructionsFingerprint: british.instructionsFingerprint,
    });

    assert.notEqual(britishKey, neutralKey);
    assert.notEqual(britishKey, shimmerKey);
  });
});
