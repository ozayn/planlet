import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCoachingNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/coaching/narration-cache-key";
import { getCoachingNarrationContentHash } from "@/lib/coaching/narration-service";
import {
  NARRATION_CONTENT_PROFILE_VERSIONS,
  NARRATION_CONTENT_PROFILES,
  NARRATION_INSTRUCTION_VERSION,
  OPENAI_NARRATION_STYLES,
} from "@/lib/life-lab/narration-config";
import {
  resolveOpenAiNarrationSettings,
} from "@/lib/life-lab/openai-narration-preferences";

describe("coaching narration cache", () => {
  it("scopes cache keys to the user", () => {
    const content = {
      reflection: "Private reflection.",
      question: null,
      experiment: null,
    };
    const contentHash = getCoachingNarrationContentHash(content);
    const settings = resolveOpenAiNarrationSettings(
      {
        voice: "marin",
        narrationStyle: "BRITISH_FEMALE_CALM",
        customNarrationInstructions: null,
      },
      { contentProfile: NARRATION_CONTENT_PROFILES.COACHING },
    );

    const userOneKey = buildCoachingNarrationCacheKey({
      userId: "user-a",
      contentHash,
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      voice: settings.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      readAloudSectionId: "reflection",
      instructionsFingerprint: settings.instructionsFingerprint,
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion:
        NARRATION_CONTENT_PROFILE_VERSIONS[NARRATION_CONTENT_PROFILES.COACHING],
      chunkIndex: 0,
    });
    const userTwoKey = buildCoachingNarrationCacheKey({
      userId: "user-b",
      contentHash,
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      voice: settings.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      readAloudSectionId: "reflection",
      instructionsFingerprint: settings.instructionsFingerprint,
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion:
        NARRATION_CONTENT_PROFILE_VERSIONS[NARRATION_CONTENT_PROFILES.COACHING],
      chunkIndex: 0,
    });

    assert.notEqual(userOneKey, userTwoKey);
  });

  it("invalidates cache when coaching content changes", () => {
    const firstHash = getCoachingNarrationContentHash({
      reflection: "First version.",
      question: null,
      experiment: null,
    });
    const secondHash = getCoachingNarrationContentHash({
      reflection: "Updated version.",
      question: null,
      experiment: null,
    });

    assert.notEqual(firstHash, secondHash);

    const settings = resolveOpenAiNarrationSettings(
      {
        voice: "marin",
        narrationStyle: "BRITISH_FEMALE_CALM",
        customNarrationInstructions: null,
      },
      { contentProfile: NARRATION_CONTENT_PROFILES.COACHING },
    );
    const base = {
      userId: "user-a",
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      voice: settings.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      readAloudSectionId: "reflection",
      instructionsFingerprint: settings.instructionsFingerprint,
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion:
        NARRATION_CONTENT_PROFILE_VERSIONS[NARRATION_CONTENT_PROFILES.COACHING],
      chunkIndex: 0,
    };

    const firstKey = buildCoachingNarrationCacheKey({
      ...base,
      contentHash: firstHash,
    });
    const secondKey = buildCoachingNarrationCacheKey({
      ...base,
      contentHash: secondHash,
    });

    assert.notEqual(firstKey, secondKey);
  });

  it("creates a new cache entry when voice or style changes", () => {
    const contentHash = hashNarrationContent("reflection:Hello.");
    const british = resolveOpenAiNarrationSettings(
      {
        voice: "marin",
        narrationStyle: "BRITISH_FEMALE_CALM",
        customNarrationInstructions: null,
      },
      { contentProfile: NARRATION_CONTENT_PROFILES.COACHING },
    );
    const neutral = resolveOpenAiNarrationSettings(
      {
        voice: "marin",
        narrationStyle: "NEUTRAL_EDUCATIONAL",
        customNarrationInstructions: null,
      },
      { contentProfile: NARRATION_CONTENT_PROFILES.COACHING },
    );

    const base = {
      userId: "user-a",
      contentHash,
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      readAloudSectionId: "reflection",
      instructionVersion: NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion:
        NARRATION_CONTENT_PROFILE_VERSIONS[NARRATION_CONTENT_PROFILES.COACHING],
      chunkIndex: 0,
    };

    const britishKey = buildCoachingNarrationCacheKey({
      ...base,
      voice: british.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      instructionsFingerprint: british.instructionsFingerprint,
    });
    const neutralKey = buildCoachingNarrationCacheKey({
      ...base,
      voice: neutral.voice,
      narrationStyle: OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.slug,
      instructionsFingerprint: neutral.instructionsFingerprint,
    });
    const shimmerKey = buildCoachingNarrationCacheKey({
      ...base,
      voice: "shimmer",
      narrationStyle: OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.slug,
      instructionsFingerprint: british.instructionsFingerprint,
    });

    assert.notEqual(britishKey, neutralKey);
    assert.notEqual(britishKey, shimmerKey);
  });

  it("uses a gentler coaching instruction profile without overriding voice", () => {
    const coaching = resolveOpenAiNarrationSettings(
      {
        voice: "coral",
        narrationStyle: "BRITISH_FEMALE_CALM",
        customNarrationInstructions: null,
      },
      { contentProfile: NARRATION_CONTENT_PROFILES.COACHING },
    );
    const lifeLab = resolveOpenAiNarrationSettings({
      voice: "coral",
      narrationStyle: "BRITISH_FEMALE_CALM",
      customNarrationInstructions: null,
    });

    assert.equal(coaching.voice, "coral");
    assert.match(coaching.instructions, /nonjudgmental tone/i);
    assert.notEqual(
      coaching.instructionsFingerprint,
      lifeLab.instructionsFingerprint,
    );
  });
});
