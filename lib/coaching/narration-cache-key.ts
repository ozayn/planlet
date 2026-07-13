import { createHash } from "node:crypto";

import { COACHING_NARRATION_INSTRUCTION_VERSION } from "@/lib/coaching/narration-config";
import { hashNarrationContent } from "@/lib/life-lab/narration-cache-key";
import {
  LIFE_LAB_READ_ALOUD_PROVIDERS,
  NARRATION_CONTENT_PROFILE_VERSIONS,
  NARRATION_CONTENT_PROFILES,
} from "@/lib/life-lab/narration-config";

export { hashNarrationContent };

export type CoachingNarrationCacheKeyInput = {
  userId: string;
  contentHash: string;
  provider: string;
  model: string;
  voice: string;
  narrationStyle: string;
  narrationProfile: string;
  readAloudSectionId: string;
  instructionsFingerprint: string;
  instructionVersion?: number;
  contentProfileVersion?: number;
  chunkIndex: number;
};

export function buildCoachingNarrationCacheKey(
  input: CoachingNarrationCacheKeyInput,
): string {
  const payload = [
    NARRATION_CONTENT_PROFILES.COACHING,
    input.narrationProfile,
    input.userId,
    input.contentHash,
    input.provider,
    input.model,
    input.voice,
    input.narrationStyle,
    input.readAloudSectionId,
    input.instructionsFingerprint,
    String(input.instructionVersion ?? COACHING_NARRATION_INSTRUCTION_VERSION),
    String(
      input.contentProfileVersion ??
        NARRATION_CONTENT_PROFILE_VERSIONS[NARRATION_CONTENT_PROFILES.COACHING],
    ),
    String(input.chunkIndex),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function buildCoachingNarrationStorageKey(cacheKey: string): string {
  return `coaching/${cacheKey}.mp3`;
}

export function getCoachingNarrationProviderId(): string {
  return LIFE_LAB_READ_ALOUD_PROVIDERS.OPENAI;
}
