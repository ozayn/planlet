import type { OpenAiNarrationStyle } from "@/app/generated/prisma/client";

import { getOpenAiTtsVoice } from "@/lib/env";
import {
  hashNarrationContent,
} from "@/lib/life-lab/narration-cache-key";
import {
  COACHING_NARRATION_CONTENT_PROFILE,
  MIXED_LANGUAGE_NARRATION_APPENDIX,
  NARRATION_CONTENT_PROFILES,
  NARRATION_INSTRUCTION_VERSION,
  NARRATION_PREVIEW_TEXT,
  OPENAI_NARRATION_STYLES,
  OPENAI_NARRATION_VOICES,
  type NarrationContentProfile,
  type OpenAiNarrationStyleId,
  isOpenAiNarrationStyle,
  isSupportedOpenAiNarrationVoice,
} from "@/lib/life-lab/narration-config";

export type OpenAiNarrationPreferences = {
  voice: string;
  narrationStyle: OpenAiNarrationStyleId;
  customNarrationInstructions: string | null;
};

export type ResolvedOpenAiNarrationSettings = {
  voice: string;
  requestedVoice: string;
  narrationStyle: OpenAiNarrationStyleId;
  instructions: string;
  instructionsFingerprint: string;
  instructionVersion: number;
  contentProfile: NarrationContentProfile;
  voiceWarning: string | null;
};

export const DEFAULT_OPENAI_NARRATION_PREFERENCES: OpenAiNarrationPreferences = {
  voice: getOpenAiTtsVoice(),
  narrationStyle: "BRITISH_FEMALE_CALM",
  customNarrationInstructions: null,
};

export function normalizeOpenAiNarrationStyle(
  value: OpenAiNarrationStyle | string | null | undefined,
): OpenAiNarrationStyleId {
  if (value && isOpenAiNarrationStyle(value)) {
    return value;
  }

  return DEFAULT_OPENAI_NARRATION_PREFERENCES.narrationStyle;
}

export function resolveOpenAiNarrationVoice(input: {
  userVoice: string | null | undefined;
  serverDefault?: string;
}): { voice: string; requestedVoice: string; voiceWarning: string | null } {
  const serverDefault = input.serverDefault?.trim() || getOpenAiTtsVoice();
  const requested = input.userVoice?.trim() || serverDefault;

  if (isSupportedOpenAiNarrationVoice(requested)) {
    return {
      voice: requested,
      requestedVoice: requested,
      voiceWarning: null,
    };
  }

  const fallback = isSupportedOpenAiNarrationVoice(serverDefault)
    ? serverDefault
    : OPENAI_NARRATION_VOICES[0]?.id ?? "marin";

  return {
    voice: fallback,
    requestedVoice: requested,
    voiceWarning: `Voice "${requested}" is not supported for OpenAI narration. Using ${fallback}.`,
  };
}

export function resolveNarrationInstructions(input: {
  narrationStyle: OpenAiNarrationStyleId;
  customNarrationInstructions?: string | null;
  contentProfile?: NarrationContentProfile;
}): string {
  const baseInstructions = (() => {
    if (input.narrationStyle === "CUSTOM") {
      const custom = input.customNarrationInstructions?.trim();

      if (!custom) {
        return OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.instructions;
      }

      return custom;
    }

    return OPENAI_NARRATION_STYLES[input.narrationStyle].instructions;
  })();

  const profileAppendix =
    input.contentProfile === NARRATION_CONTENT_PROFILES.COACHING
      ? COACHING_NARRATION_CONTENT_PROFILE
      : null;

  return [
    baseInstructions,
    profileAppendix,
    MIXED_LANGUAGE_NARRATION_APPENDIX,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function resolveOpenAiNarrationSettings(
  preferences: OpenAiNarrationPreferences,
  options?: {
    contentProfile?: NarrationContentProfile;
  },
): ResolvedOpenAiNarrationSettings {
  const narrationStyle = normalizeOpenAiNarrationStyle(preferences.narrationStyle);
  const contentProfile =
    options?.contentProfile ?? NARRATION_CONTENT_PROFILES.LIFE_LAB;
  const voiceResolution = resolveOpenAiNarrationVoice({
    userVoice: preferences.voice,
  });
  const instructions = resolveNarrationInstructions({
    narrationStyle,
    customNarrationInstructions: preferences.customNarrationInstructions,
    contentProfile,
  });

  return {
    voice: voiceResolution.voice,
    requestedVoice: voiceResolution.requestedVoice,
    narrationStyle,
    instructions,
    instructionsFingerprint: hashNarrationContent(instructions),
    instructionVersion: NARRATION_INSTRUCTION_VERSION,
    contentProfile,
    voiceWarning: voiceResolution.voiceWarning,
  };
}

export function getNarrationPreviewText(): string {
  return NARRATION_PREVIEW_TEXT;
}

export function formatOpenAiNarrationVoiceLabel(voiceId: string): string {
  const match = OPENAI_NARRATION_VOICES.find((voice) => voice.id === voiceId);
  return match?.label ?? voiceId;
}

export function formatOpenAiNarrationStyleLabel(
  style: OpenAiNarrationStyleId,
): string {
  return OPENAI_NARRATION_STYLES[style].label;
}
