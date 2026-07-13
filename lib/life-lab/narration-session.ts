import { randomUUID } from "node:crypto";

import { hashNarrationContent } from "@/lib/life-lab/narration-cache-key";
import {
  NARRATION_CONTENT_PROFILES,
  NARRATION_CONTENT_PROFILE_VERSIONS,
  NARRATION_INSTRUCTION_VERSION,
  OPENAI_NARRATION_STYLES,
  type NarrationContentProfile,
  type OpenAiNarrationStyleId,
  isOpenAiNarrationStyle,
  isSupportedOpenAiNarrationVoice,
} from "@/lib/life-lab/narration-config";
import type { ResolvedOpenAiNarrationSettings } from "@/lib/life-lab/openai-narration-preferences";
import type { ResolvedCoachingNarrationSettings } from "@/lib/coaching/narration-preferences";
import { COACHING_NARRATION_INSTRUCTION_VERSION } from "@/lib/coaching/narration-config";

/** Default TTS model when a session does not override it. */
export const DEFAULT_OPENAI_NARRATION_SESSION_MODEL = "gpt-4o-mini-tts";

export type OpenAiNarrationSessionConfig = {
  provider: "OPENAI";
  sessionId: string;
  model: string;
  voice: string;
  style: string;
  instructions: string;
  instructionsFingerprint: string;
  instructionVersion: number;
  contentProfile: NarrationContentProfile;
  contentProfileVersion: number;
};

export type NarrationChunkCompatibilityInput = {
  model: string | null | undefined;
  voice: string | null | undefined;
  narrationStyle: string | null | undefined;
  instructionsFingerprint: string | null | undefined;
  instructionVersion: number | null | undefined;
  contentProfile: string | null | undefined;
  contentProfileVersion?: number | null | undefined;
  contentHash?: string | null | undefined;
  sectionId?: string | null | undefined;
  chunkIndex?: number | null | undefined;
};

function expectedProfileVersion(profile: NarrationContentProfile): number {
  return NARRATION_CONTENT_PROFILE_VERSIONS[profile];
}

export function createOpenAiNarrationSessionId(): string {
  return randomUUID();
}

export function buildLifeLabNarrationSessionConfig(input: {
  settings: ResolvedOpenAiNarrationSettings;
  model?: string;
  sessionId?: string;
}): OpenAiNarrationSessionConfig {
  const styleSlug = OPENAI_NARRATION_STYLES[input.settings.narrationStyle].slug;
  const instructionsFingerprint =
    input.settings.instructionsFingerprint ||
    hashNarrationContent(input.settings.instructions);

  return {
    provider: "OPENAI",
    sessionId: input.sessionId ?? createOpenAiNarrationSessionId(),
    model: input.model?.trim() || DEFAULT_OPENAI_NARRATION_SESSION_MODEL,
    voice: input.settings.voice,
    style: styleSlug,
    instructions: input.settings.instructions,
    instructionsFingerprint,
    instructionVersion:
      input.settings.instructionVersion ?? NARRATION_INSTRUCTION_VERSION,
    contentProfile: input.settings.contentProfile,
    contentProfileVersion: expectedProfileVersion(input.settings.contentProfile),
  };
}

export function buildCoachingNarrationSessionConfig(input: {
  settings: ResolvedCoachingNarrationSettings;
  model?: string;
  sessionId?: string;
}): OpenAiNarrationSessionConfig {
  const instructionsFingerprint =
    input.settings.instructionsFingerprint ||
    hashNarrationContent(input.settings.instructions);

  return {
    provider: "OPENAI",
    sessionId: input.sessionId ?? createOpenAiNarrationSessionId(),
    model: input.model?.trim() || DEFAULT_OPENAI_NARRATION_SESSION_MODEL,
    voice: input.settings.voice,
    style: input.settings.narrationStyleSlug,
    instructions: input.settings.instructions,
    instructionsFingerprint,
    instructionVersion:
      input.settings.instructionVersion ?? COACHING_NARRATION_INSTRUCTION_VERSION,
    contentProfile: NARRATION_CONTENT_PROFILES.COACHING,
    contentProfileVersion:
      input.settings.contentProfileVersion ??
      expectedProfileVersion(NARRATION_CONTENT_PROFILES.COACHING),
  };
}

export function serializeNarrationSessionConfig(
  config: OpenAiNarrationSessionConfig,
): Record<string, string | number> {
  return {
    provider: config.provider,
    sessionId: config.sessionId,
    model: config.model,
    voice: config.voice,
    style: config.style,
    instructions: config.instructions,
    instructionsFingerprint: config.instructionsFingerprint,
    instructionVersion: config.instructionVersion,
    contentProfile: config.contentProfile,
    contentProfileVersion: config.contentProfileVersion,
  };
}

export function parseOpenAiNarrationSessionConfig(
  value: unknown,
): OpenAiNarrationSessionConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const provider = record.provider;
  const sessionId =
    typeof record.sessionId === "string" ? record.sessionId.trim() : "";
  const model = typeof record.model === "string" ? record.model.trim() : "";
  const voice = typeof record.voice === "string" ? record.voice.trim() : "";
  const style = typeof record.style === "string" ? record.style.trim() : "";
  const instructions =
    typeof record.instructions === "string" ? record.instructions : "";
  const instructionsFingerprint =
    typeof record.instructionsFingerprint === "string"
      ? record.instructionsFingerprint.trim()
      : "";
  const contentProfile =
    typeof record.contentProfile === "string"
      ? record.contentProfile.trim()
      : "";
  const instructionVersion = Number(record.instructionVersion);
  const contentProfileVersion = Number(record.contentProfileVersion);

  if (provider !== "OPENAI") {
    return null;
  }

  if (
    !sessionId ||
    !model ||
    !voice ||
    !style ||
    !instructions ||
    !instructionsFingerprint ||
    !contentProfile ||
    !Number.isInteger(instructionVersion) ||
    instructionVersion < 1 ||
    !Number.isInteger(contentProfileVersion) ||
    contentProfileVersion < 1
  ) {
    return null;
  }

  if (
    contentProfile !== NARRATION_CONTENT_PROFILES.LIFE_LAB &&
    contentProfile !== NARRATION_CONTENT_PROFILES.COACHING
  ) {
    return null;
  }

  if (!isSupportedOpenAiNarrationVoice(voice)) {
    return null;
  }

  const fingerprintMatches =
    hashNarrationContent(instructions) === instructionsFingerprint;

  if (!fingerprintMatches) {
    return null;
  }

  return {
    provider: "OPENAI",
    sessionId,
    model,
    voice,
    style,
    instructions,
    instructionsFingerprint,
    instructionVersion,
    contentProfile,
    contentProfileVersion,
  };
}

/**
 * True when a cached chunk (or response metadata) may play in this session.
 * Legacy records missing required fields are rejected.
 */
export function isNarrationChunkCompatible(
  chunk: NarrationChunkCompatibilityInput,
  session: OpenAiNarrationSessionConfig,
  expected?: {
    contentHash?: string;
    sectionId?: string;
    chunkIndex?: number;
  },
): boolean {
  if (
    !chunk.model ||
    !chunk.voice ||
    !chunk.narrationStyle ||
    !chunk.instructionsFingerprint ||
    chunk.instructionVersion == null ||
    !chunk.contentProfile
  ) {
    return false;
  }

  if (chunk.model !== session.model) {
    return false;
  }

  if (chunk.voice !== session.voice) {
    return false;
  }

  if (chunk.narrationStyle !== session.style) {
    return false;
  }

  if (chunk.instructionsFingerprint !== session.instructionsFingerprint) {
    return false;
  }

  if (chunk.instructionVersion !== session.instructionVersion) {
    return false;
  }

  if (chunk.contentProfile !== session.contentProfile) {
    return false;
  }

  if (
    chunk.contentProfileVersion != null &&
    chunk.contentProfileVersion !== session.contentProfileVersion
  ) {
    return false;
  }

  if (
    expected?.contentHash &&
    chunk.contentHash &&
    chunk.contentHash !== expected.contentHash
  ) {
    return false;
  }

  if (
    expected?.sectionId &&
    chunk.sectionId &&
    chunk.sectionId !== expected.sectionId
  ) {
    return false;
  }

  if (
    expected?.chunkIndex != null &&
    chunk.chunkIndex != null &&
    chunk.chunkIndex !== expected.chunkIndex
  ) {
    return false;
  }

  return true;
}

export function narrationStyleIdFromSessionStyle(
  style: string,
): OpenAiNarrationStyleId | null {
  if (isOpenAiNarrationStyle(style)) {
    return style;
  }

  for (const [id, meta] of Object.entries(OPENAI_NARRATION_STYLES)) {
    if (meta.slug === style) {
      return id as OpenAiNarrationStyleId;
    }
  }

  return null;
}

export function logNarrationSessionStart(input: {
  session: OpenAiNarrationSessionConfig;
  contentId: string;
  sectionCount: number;
}): void {
  console.info(
    "[life-lab-narration-session]",
    JSON.stringify({
      sessionId: input.session.sessionId,
      contentId: input.contentId,
      profile: input.session.contentProfile,
      model: input.session.model,
      voice: input.session.voice,
      style: input.session.style,
      instructionsFingerprint: input.session.instructionsFingerprint,
      instructionVersion: input.session.instructionVersion,
      sectionCount: input.sectionCount,
    }),
  );
}

export function logNarrationChunkDiagnostic(input: {
  sessionId: string;
  sectionId: string;
  chunkIndex: number;
  source: "cache" | "fresh";
  cachedVoice?: string | null;
  cachedStyle?: string | null;
  compatible: boolean;
}): void {
  console.info(
    "[narration-chunk]",
    JSON.stringify({
      sessionId: input.sessionId,
      sectionId: input.sectionId,
      chunkIndex: input.chunkIndex,
      source: input.source,
      cachedVoice: input.cachedVoice ?? null,
      cachedStyle: input.cachedStyle ?? null,
      compatible: input.compatible,
    }),
  );
}

export function logNarrationConfigurationMismatch(input: {
  sessionId: string;
  sectionId?: string;
  chunkIndex?: number;
  expected: Partial<OpenAiNarrationSessionConfig>;
  received: Partial<NarrationChunkCompatibilityInput>;
}): void {
  console.warn(
    "narration_configuration_mismatch",
    JSON.stringify({
      sessionId: input.sessionId,
      sectionId: input.sectionId ?? null,
      chunkIndex: input.chunkIndex ?? null,
      expectedVoice: input.expected.voice ?? null,
      expectedStyle: input.expected.style ?? null,
      expectedModel: input.expected.model ?? null,
      expectedFingerprint: input.expected.instructionsFingerprint ?? null,
      receivedVoice: input.received.voice ?? null,
      receivedStyle: input.received.narrationStyle ?? null,
      receivedModel: input.received.model ?? null,
      receivedFingerprint: input.received.instructionsFingerprint ?? null,
    }),
  );
}

export type OrderedNarrationChunkCandidate = NarrationChunkCompatibilityInput & {
  sectionOrder: number;
  chunkIndex: number;
  sectionId: string;
};

/**
 * Filter to session-compatible chunks, then sort by canonical section order
 * and chunk index (never by cache timestamp or fetch completion time).
 */
export function buildCompatibleNarrationChunkQueue(
  candidates: OrderedNarrationChunkCandidate[],
  session: OpenAiNarrationSessionConfig,
  expected?: {
    contentHash?: string;
  },
): OrderedNarrationChunkCandidate[] {
  return candidates
    .filter((chunk) =>
      isNarrationChunkCompatible(chunk, session, {
        contentHash: expected?.contentHash,
        sectionId: chunk.sectionId,
        chunkIndex: chunk.chunkIndex,
      }),
    )
    .slice()
    .sort((a, b) => {
      if (a.sectionOrder !== b.sectionOrder) {
        return a.sectionOrder - b.sectionOrder;
      }

      return a.chunkIndex - b.chunkIndex;
    });
}
