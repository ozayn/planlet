import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  LIFE_LAB_READ_ALOUD_PROVIDERS,
  NARRATION_INSTRUCTION_VERSION,
  OPENAI_NARRATION_STYLES,
  OPENAI_NARRATION_VOICES,
} from "@/lib/life-lab/narration-config";
import {
  DEFAULT_OPENAI_NARRATION_PREFERENCES,
  getNarrationPreviewText,
  resolveNarrationInstructions,
  resolveOpenAiNarrationSettings,
  resolveOpenAiNarrationVoice,
} from "@/lib/life-lab/openai-narration-preferences";
import { COACHING_OPENAI_NARRATION_STYLES as COACHING_STYLES } from "@/lib/coaching/narration-config";
import { resolveCoachingOpenAiNarrationSettings } from "@/lib/coaching/narration-preferences";

describe("open ai narration preferences", () => {
  it("defaults to Calm educational without guaranteeing a British accent", () => {
    assert.equal(
      DEFAULT_OPENAI_NARRATION_PREFERENCES.narrationStyle,
      "NEUTRAL_EDUCATIONAL",
    );
    assert.equal(
      OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.label,
      "Calm educational",
    );
    assert.match(
      OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.description,
      /Accent may vary/i,
    );
    assert.doesNotMatch(
      OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.label,
      /British/i,
    );
    assert.doesNotMatch(
      resolveNarrationInstructions({
        narrationStyle: "NEUTRAL_EDUCATIONAL",
      }),
      /British female/i,
    );
  });

  it("offers British-leaning educational as best-effort only", () => {
    assert.equal(
      OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.label,
      "British-leaning educational",
    );
    assert.match(
      OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.description,
      /Results may vary by voice/i,
    );
    assert.doesNotMatch(
      OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.instructions,
      /British female voice/i,
    );
    assert.match(
      resolveNarrationInstructions({
        narrationStyle: "BRITISH_FEMALE_CALM",
      }),
      /British English pronunciation where the model supports it/i,
    );
  });

  it("does not promise a British Coaching accent in UI copy", () => {
    assert.equal(COACHING_STYLES.KIND_BRITISH_MENTOR.label, "Kind mentor");
    assert.match(
      COACHING_STYLES.KIND_BRITISH_MENTOR.description,
      /Accent may vary/i,
    );
    assert.doesNotMatch(COACHING_STYLES.KIND_BRITISH_MENTOR.label, /British/i);
    assert.doesNotMatch(
      COACHING_STYLES.KIND_BRITISH_MENTOR.instructions,
      /Southern British/i,
    );
  });

  it("lists OpenAI voices including the suggested comparison set", () => {
    const ids = OPENAI_NARRATION_VOICES.map((voice) => voice.id);
    assert.deepEqual(ids.slice(0, 4), ["fable", "shimmer", "marin", "coral"]);
  });

  it("appends mixed-language guidance without rewriting note text", () => {
    const instructions = resolveNarrationInstructions({
      narrationStyle: "NEUTRAL_EDUCATIONAL",
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

    const calm = resolveOpenAiNarrationSettings({
      voice: "marin",
      narrationStyle: "NEUTRAL_EDUCATIONAL",
      customNarrationInstructions: null,
    });
    const britishLeaning = resolveOpenAiNarrationSettings({
      voice: "marin",
      narrationStyle: "BRITISH_FEMALE_CALM",
      customNarrationInstructions: null,
    });

    const calmKey = buildNarrationCacheKey({
      ...base,
      voice: calm.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.slug,
      instructionsFingerprint: calm.instructionsFingerprint,
      readAloudSectionId: "summary",
    });
    const britishKey = buildNarrationCacheKey({
      ...base,
      voice: britishLeaning.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      instructionsFingerprint: britishLeaning.instructionsFingerprint,
      readAloudSectionId: "summary",
    });
    const shimmerKey = buildNarrationCacheKey({
      ...base,
      voice: "shimmer",
      narrationStyle: OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.slug,
      instructionsFingerprint: calm.instructionsFingerprint,
      readAloudSectionId: "summary",
    });
    const coralKey = buildNarrationCacheKey({
      ...base,
      voice: "coral",
      narrationStyle: OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.slug,
      instructionsFingerprint: calm.instructionsFingerprint,
      readAloudSectionId: "summary",
    });

    assert.notEqual(calmKey, britishKey);
    assert.notEqual(calmKey, shimmerKey);
    assert.notEqual(shimmerKey, coralKey);
  });

  it("keeps Coaching and Life Lab delivery profiles separate", () => {
    const lifeLab = resolveOpenAiNarrationSettings({
      voice: "fable",
      narrationStyle: "NEUTRAL_EDUCATIONAL",
      customNarrationInstructions: null,
    });
    const coaching = resolveCoachingOpenAiNarrationSettings({
      openAiTtsVoice: "fable",
      openAiNarrationStyle: "KIND_BRITISH_MENTOR",
      hasExplicitOpenAiVoice: true,
    });

    assert.notEqual(lifeLab.instructionsFingerprint, coaching.instructionsFingerprint);
    assert.match(coaching.instructions, /experienced therapist or mentor/i);
    assert.match(lifeLab.instructions, /educational documentary/i);
  });

  it("keeps Device Voice available as a provider", () => {
    assert.equal(LIFE_LAB_READ_ALOUD_PROVIDERS.DEVICE, "DEVICE");
    assert.equal(LIFE_LAB_READ_ALOUD_PROVIDERS.OPENAI, "OPENAI");
  });
});
