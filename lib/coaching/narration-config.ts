import type { OpenAiNarrationVoiceId } from "@/lib/life-lab/narration-config";
import {
  MIXED_LANGUAGE_NARRATION_APPENDIX,
  NARRATION_CONTENT_PROFILE_VERSIONS,
  NARRATION_CONTENT_PROFILES,
  isSupportedOpenAiNarrationVoice,
} from "@/lib/life-lab/narration-config";

/** Bump when Coaching instruction text / profile semantics change. */
export const COACHING_NARRATION_INSTRUCTION_VERSION = 5;

export const COACHING_DEFAULT_OPENAI_VOICE: OpenAiNarrationVoiceId = "fable";

export const COACHING_PREFERRED_OPENAI_VOICES = [
  "fable",
  "shimmer",
  "marin",
  "coral",
  "cedar",
] as const satisfies readonly OpenAiNarrationVoiceId[];

export const COACHING_OPENAI_NARRATION_STYLE_IDS = [
  "KIND_BRITISH_MENTOR",
] as const;

export type CoachingOpenAiNarrationStyleId =
  (typeof COACHING_OPENAI_NARRATION_STYLE_IDS)[number];

export const COACHING_OPENAI_NARRATION_STYLES: Record<
  CoachingOpenAiNarrationStyleId,
  { slug: string; label: string; description: string; instructions: string }
> = {
  KIND_BRITISH_MENTOR: {
    slug: "kind-mentor",
    label: "Kind mentor",
    description: "Warm, reflective delivery. Accent may vary.",
    instructions: [
      "Speak with the calm kindness of an experienced therapist or mentor.",
      "Sound warm, emotionally present, reassuring, patient, and thoughtful.",
      "Never sound robotic, promotional, theatrical, overly cheerful, or like a customer-service representative.",
      "Read slowly enough to allow reflection.",
      "Pause naturally after reflective questions.",
      "Treat difficult emotions gently.",
      "Avoid dramatic emphasis.",
      "The listener should feel listened to, not lectured.",
      "For exercises: give gentle pauses after each instruction.",
    ].join("\n\n"),
  },
};

export const COACHING_NARRATION_PREVIEW_TEXT = [
  "Take a slow breath.",
  "",
  "Notice what you're feeling without trying to change it.",
  "",
  "There is no need to rush.",
  "",
  "Let's simply become curious about what is present.",
].join("\n");

export function isCoachingOpenAiNarrationStyle(
  value: string,
): value is CoachingOpenAiNarrationStyleId {
  return COACHING_OPENAI_NARRATION_STYLE_IDS.includes(
    value as CoachingOpenAiNarrationStyleId,
  );
}

export function resolveCoachingOpenAiNarrationVoice(input: {
  userVoice: string | null | undefined;
}): { voice: string; requestedVoice: string; voiceWarning: string | null } {
  const requested =
    input.userVoice?.trim() || COACHING_DEFAULT_OPENAI_VOICE;

  if (isSupportedOpenAiNarrationVoice(requested)) {
    return {
      voice: requested,
      requestedVoice: requested,
      voiceWarning: null,
    };
  }

  return {
    voice: COACHING_DEFAULT_OPENAI_VOICE,
    requestedVoice: requested,
    voiceWarning: `Voice "${requested}" is not supported for Coaching narration. Using ${COACHING_DEFAULT_OPENAI_VOICE}.`,
  };
}

export function resolveCoachingNarrationInstructions(
  style: CoachingOpenAiNarrationStyleId,
): string {
  return [
    COACHING_OPENAI_NARRATION_STYLES[style].instructions,
    MIXED_LANGUAGE_NARRATION_APPENDIX,
  ].join("\n\n");
}

export function getCoachingContentProfileVersion(): number {
  return NARRATION_CONTENT_PROFILE_VERSIONS[NARRATION_CONTENT_PROFILES.COACHING];
}

export function formatCoachingOpenAiNarrationStyleLabel(
  style: CoachingOpenAiNarrationStyleId,
): string {
  return COACHING_OPENAI_NARRATION_STYLES[style].label;
}

export type CoachingNarrationPreferences = {
  openAiTtsVoice: string;
  openAiNarrationStyle: CoachingOpenAiNarrationStyleId;
  hasExplicitOpenAiVoice?: boolean;
};

export const DEFAULT_COACHING_NARRATION_PREFERENCES: CoachingNarrationPreferences =
  {
    openAiTtsVoice: COACHING_DEFAULT_OPENAI_VOICE,
    openAiNarrationStyle: "KIND_BRITISH_MENTOR",
    hasExplicitOpenAiVoice: false,
  };

