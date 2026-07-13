import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCoachingNarrationCacheKey,
  hashNarrationContent,
} from "@/lib/coaching/narration-cache-key";
import {
  COACHING_DEFAULT_OPENAI_VOICE,
  COACHING_NARRATION_INSTRUCTION_VERSION,
  COACHING_OPENAI_NARRATION_STYLES,
  getCoachingContentProfileVersion,
} from "@/lib/coaching/narration-config";
import {
  resolveCoachingOpenAiNarrationSettings,
} from "@/lib/coaching/narration-preferences";
import { getCoachingNarrationContentHash } from "@/lib/coaching/narration-service";
import { NARRATION_CONTENT_PROFILES } from "@/lib/life-lab/narration-config";
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
    const settings = resolveCoachingOpenAiNarrationSettings({
      openAiTtsVoice: COACHING_DEFAULT_OPENAI_VOICE,
      openAiNarrationStyle: "KIND_BRITISH_MENTOR",
    });

    const userOneKey = buildCoachingNarrationCacheKey({
      userId: "user-a",
      contentHash,
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      voice: settings.voice,
      narrationStyle: settings.narrationStyleSlug,
      narrationProfile: NARRATION_CONTENT_PROFILES.COACHING,
      readAloudSectionId: "reflection",
      instructionsFingerprint: settings.instructionsFingerprint,
      instructionVersion: COACHING_NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion: getCoachingContentProfileVersion(),
      chunkIndex: 0,
    });
    const userTwoKey = buildCoachingNarrationCacheKey({
      userId: "user-b",
      contentHash,
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      voice: settings.voice,
      narrationStyle: settings.narrationStyleSlug,
      narrationProfile: NARRATION_CONTENT_PROFILES.COACHING,
      readAloudSectionId: "reflection",
      instructionsFingerprint: settings.instructionsFingerprint,
      instructionVersion: COACHING_NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion: getCoachingContentProfileVersion(),
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

    const settings = resolveCoachingOpenAiNarrationSettings({
      openAiTtsVoice: COACHING_DEFAULT_OPENAI_VOICE,
      openAiNarrationStyle: "KIND_BRITISH_MENTOR",
    });
    const base = {
      userId: "user-a",
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      voice: settings.voice,
      narrationStyle: settings.narrationStyleSlug,
      narrationProfile: NARRATION_CONTENT_PROFILES.COACHING,
      readAloudSectionId: "reflection",
      instructionsFingerprint: settings.instructionsFingerprint,
      instructionVersion: COACHING_NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion: getCoachingContentProfileVersion(),
      chunkIndex: 0,
    };

    assert.notEqual(
      buildCoachingNarrationCacheKey({ ...base, contentHash: firstHash }),
      buildCoachingNarrationCacheKey({ ...base, contentHash: secondHash }),
    );
  });

  it("creates a new cache entry when Coaching voice changes", () => {
    const contentHash = hashNarrationContent("reflection:Hello.");
    const fable = resolveCoachingOpenAiNarrationSettings({
      openAiTtsVoice: "fable",
      openAiNarrationStyle: "KIND_BRITISH_MENTOR",
    });
    const shimmer = resolveCoachingOpenAiNarrationSettings({
      openAiTtsVoice: "shimmer",
      openAiNarrationStyle: "KIND_BRITISH_MENTOR",
    });

    const base = {
      userId: "user-a",
      contentHash,
      provider: "OPENAI",
      model: "gpt-4o-mini-tts",
      narrationStyle: COACHING_OPENAI_NARRATION_STYLES.KIND_BRITISH_MENTOR.slug,
      narrationProfile: NARRATION_CONTENT_PROFILES.COACHING,
      readAloudSectionId: "reflection",
      instructionVersion: COACHING_NARRATION_INSTRUCTION_VERSION,
      contentProfileVersion: getCoachingContentProfileVersion(),
      chunkIndex: 0,
    };

    assert.notEqual(
      buildCoachingNarrationCacheKey({
        ...base,
        voice: fable.voice,
        instructionsFingerprint: fable.instructionsFingerprint,
      }),
      buildCoachingNarrationCacheKey({
        ...base,
        voice: shimmer.voice,
        instructionsFingerprint: shimmer.instructionsFingerprint,
      }),
    );
  });

  it("uses Kind British Mentor instructions instead of Life Lab styles", () => {
    const coaching = resolveCoachingOpenAiNarrationSettings({
      openAiTtsVoice: "fable",
      openAiNarrationStyle: "KIND_BRITISH_MENTOR",
    });
    const lifeLab = resolveOpenAiNarrationSettings({
      voice: "coral",
      narrationStyle: "BRITISH_FEMALE_CALM",
      customNarrationInstructions: null,
    });

    assert.equal(coaching.voice, "fable");
    assert.equal(coaching.narrationStyle, "KIND_BRITISH_MENTOR");
    assert.match(coaching.instructions, /experienced British therapist or mentor/i);
    assert.match(coaching.instructions, /feel listened to, not lectured/i);
    assert.match(coaching.instructions, /gentle pauses after each instruction/i);
    assert.match(coaching.instructions, /Persian/i);
    assert.doesNotMatch(coaching.instructions, /documentary narrator/i);
    assert.doesNotMatch(coaching.instructions, /nonjudgmental tone/i);
    assert.notEqual(coaching.instructionsFingerprint, lifeLab.instructionsFingerprint);
    assert.equal(lifeLab.contentProfile, "life-lab");
    assert.match(lifeLab.instructions, /documentary narrator/i);
  });

  it("defaults Coaching voice to fable independently of Life Lab env defaults", () => {
    const settings = resolveCoachingOpenAiNarrationSettings({
      openAiTtsVoice: "",
      openAiNarrationStyle: "KIND_BRITISH_MENTOR",
    });

    assert.equal(settings.voice, "fable");
  });
});
