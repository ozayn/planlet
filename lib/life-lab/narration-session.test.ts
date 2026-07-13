import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashNarrationContent } from "@/lib/life-lab/narration-cache-key";
import {
  NARRATION_CONTENT_PROFILES,
  OPENAI_NARRATION_STYLES,
} from "@/lib/life-lab/narration-config";
import {
  buildCompatibleNarrationChunkQueue,
  buildCoachingNarrationSessionConfig,
  buildLifeLabNarrationSessionConfig,
  isNarrationChunkCompatible,
  type OpenAiNarrationSessionConfig,
} from "@/lib/life-lab/narration-session";
import type { ResolvedOpenAiNarrationSettings } from "@/lib/life-lab/openai-narration-preferences";
import type { ResolvedCoachingNarrationSettings } from "@/lib/coaching/narration-preferences";
import { LIFE_LAB_READ_ALOUD_PROVIDERS } from "@/lib/life-lab/narration-config";

function lifeLabSettings(
  overrides: Partial<ResolvedOpenAiNarrationSettings> = {},
): ResolvedOpenAiNarrationSettings {
  const style = overrides.narrationStyle ?? "BRITISH_FEMALE_CALM";
  const instructions =
    overrides.instructions ?? OPENAI_NARRATION_STYLES[style].instructions;

  return {
    voice: "fable",
    requestedVoice: "fable",
    narrationStyle: style,
    instructions,
    instructionsFingerprint: hashNarrationContent(instructions),
    instructionVersion: 6,
    contentProfile: NARRATION_CONTENT_PROFILES.LIFE_LAB,
    voiceWarning: null,
    ...overrides,
  };
}

function coachingSettings(
  overrides: Partial<ResolvedCoachingNarrationSettings> = {},
): ResolvedCoachingNarrationSettings {
  const instructions =
    overrides.instructions ??
    "Speak with the calm kindness of an experienced British mentor.";

  return {
    voice: "fable",
    requestedVoice: "fable",
    narrationStyle: "KIND_BRITISH_MENTOR",
    narrationStyleSlug: "kind-british-mentor",
    instructions,
    instructionsFingerprint: hashNarrationContent(instructions),
    instructionVersion: 4,
    contentProfileVersion: 5,
    voiceWarning: null,
    ...overrides,
  };
}

function chunkMeta(
  session: OpenAiNarrationSessionConfig,
  overrides: Partial<Parameters<typeof isNarrationChunkCompatible>[0]> = {},
) {
  return {
    model: session.model,
    voice: session.voice,
    narrationStyle: session.style,
    instructionsFingerprint: session.instructionsFingerprint,
    instructionVersion: session.instructionVersion,
    contentProfile: session.contentProfile,
    contentProfileVersion: session.contentProfileVersion,
    contentHash: "hash-a",
    sectionId: "section-1",
    chunkIndex: 0,
    ...overrides,
  };
}

describe("OpenAI narration session lock", () => {
  it("locks identical voice and instructions fingerprint for all session chunks", () => {
    const session = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings({ voice: "coral" }),
      model: "gpt-4o-mini-tts",
      sessionId: "session-1",
    });

    const voices = [0, 1, 2].map(() => session.voice);
    const fingerprints = [0, 1, 2].map(() => session.instructionsFingerprint);

    assert.deepEqual(voices, ["coral", "coral", "coral"]);
    assert.equal(new Set(fingerprints).size, 1);
  });

  it("rejects a coral cached chunk during a fable session", () => {
    const session = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings({ voice: "fable" }),
      sessionId: "session-fable",
    });

    assert.equal(
      isNarrationChunkCompatible(
        chunkMeta(session, { voice: "coral" }),
        session,
      ),
      false,
    );
  });

  it("rejects a neutral cached chunk during a British session", () => {
    const session = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings({ narrationStyle: "BRITISH_FEMALE_CALM" }),
      sessionId: "session-british",
    });

    assert.equal(
      isNarrationChunkCompatible(
        chunkMeta(session, {
          narrationStyle: OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.slug,
          instructionsFingerprint: hashNarrationContent(
            OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.instructions,
          ),
        }),
        session,
      ),
      false,
    );
  });

  it("rejects a Life Lab chunk during a Coaching session", () => {
    const coaching = buildCoachingNarrationSessionConfig({
      settings: coachingSettings(),
      sessionId: "session-coaching",
    });

    assert.equal(
      isNarrationChunkCompatible(
        chunkMeta(coaching, {
          contentProfile: NARRATION_CONTENT_PROFILES.LIFE_LAB,
        }),
        coaching,
      ),
      false,
    );
  });

  it("preserves session config across section jumps", () => {
    const session = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings({ voice: "marin" }),
      sessionId: "session-jump",
    });

    // Section jump uses the same locked config; never rebuilds from prefs.
    const afterJump = { ...session };
    assert.equal(afterJump.voice, "marin");
    assert.equal(afterJump.sessionId, session.sessionId);
    assert.equal(afterJump.style, session.style);
    assert.equal(
      afterJump.instructionsFingerprint,
      session.instructionsFingerprint,
    );
  });

  it("keeps the active session unchanged when settings change mid-playback", () => {
    const session = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings({ voice: "echo" }),
      sessionId: "session-settings",
    });
    const locked = structuredClone(session);

    const nextSessionWouldBe = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings({ voice: "nova" }),
      sessionId: "session-next",
    });

    assert.equal(locked.voice, "echo");
    assert.notEqual(locked.voice, nextSessionWouldBe.voice);
    assert.equal(locked.sessionId, "session-settings");
  });

  it("treats legacy cache records without metadata as a miss", () => {
    const session = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings(),
      sessionId: "session-legacy",
    });

    assert.equal(
      isNarrationChunkCompatible(
        {
          model: session.model,
          voice: session.voice,
          narrationStyle: null,
          instructionsFingerprint: null,
          instructionVersion: session.instructionVersion,
          contentProfile: null,
        },
        session,
      ),
      false,
    );
  });

  it("builds a mixed cache/fresh queue without incompatible chunks", () => {
    const session = buildLifeLabNarrationSessionConfig({
      settings: lifeLabSettings({ voice: "fable" }),
      sessionId: "session-queue",
    });

    const queue = buildCompatibleNarrationChunkQueue(
      [
        {
          ...chunkMeta(session, {
            sectionId: "b",
            chunkIndex: 2,
            voice: "coral",
          }),
          sectionOrder: 1,
        },
        {
          ...chunkMeta(session, { sectionId: "a", chunkIndex: 1 }),
          sectionOrder: 0,
        },
        {
          ...chunkMeta(session, {
            sectionId: "c",
            chunkIndex: 0,
            contentProfile: NARRATION_CONTENT_PROFILES.COACHING,
          }),
          sectionOrder: 2,
        },
        {
          ...chunkMeta(session, { sectionId: "a", chunkIndex: 0 }),
          sectionOrder: 0,
        },
      ],
      session,
      { contentHash: "hash-a" },
    );

    assert.equal(queue.length, 2);
    assert.deepEqual(
      queue.map((chunk) => [chunk.sectionOrder, chunk.chunkIndex]),
      [
        [0, 0],
        [0, 1],
      ],
    );
    assert.ok(queue.every((chunk) => chunk.voice === "fable"));
  });

  it("leaves Device Voice outside the OpenAI session-lock path", () => {
    assert.equal(LIFE_LAB_READ_ALOUD_PROVIDERS.DEVICE, "DEVICE");
    assert.notEqual(LIFE_LAB_READ_ALOUD_PROVIDERS.DEVICE, "OPENAI");
  });
});
