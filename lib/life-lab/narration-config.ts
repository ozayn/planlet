import type { LifeLabReadAloudProvider } from "@/app/generated/prisma/client";

export const NARRATION_INSTRUCTION_VERSION = 7;

export const NARRATION_PREVIEW_TEXT =
  "Personal identity asks what allows a person to remain the same over time. Philosophers disagree about whether continuity depends on the body, the mind, memory, or the soul.";

/** Preferred comparison set — accent is empirical, not guaranteed. */
export const OPENAI_NARRATION_SUGGESTED_VOICES = [
  "fable",
  "shimmer",
  "marin",
  "coral",
] as const;

export const OPENAI_NARRATION_VOICES = [
  { id: "fable", label: "Fable" },
  { id: "shimmer", label: "Shimmer" },
  { id: "marin", label: "Marin" },
  { id: "coral", label: "Coral" },
  { id: "nova", label: "Nova" },
  { id: "cedar", label: "Cedar" },
  { id: "alloy", label: "Alloy" },
  { id: "echo", label: "Echo" },
  { id: "sage", label: "Sage" },
] as const;

export type OpenAiNarrationVoiceId =
  (typeof OPENAI_NARRATION_VOICES)[number]["id"];

/** Default explicit preference when the user has not saved a voice yet. */
export const DEFAULT_OPENAI_NARRATION_VOICE: OpenAiNarrationVoiceId = "fable";

/**
 * UI order: calm default first, then optional British-leaning, then others.
 * Enum ids stay stable for Prisma compatibility.
 */
export const OPENAI_NARRATION_STYLE_IDS = [
  "NEUTRAL_EDUCATIONAL",
  "BRITISH_FEMALE_CALM",
  "WARM_CONVERSATIONAL",
  "CUSTOM",
] as const;

export type OpenAiNarrationStyleId = (typeof OPENAI_NARRATION_STYLE_IDS)[number];

export type OpenAiNarrationStyleMeta = {
  slug: string;
  label: string;
  /** Short helper under the style label in Settings. */
  description: string;
  instructions: string;
};

export const OPENAI_NARRATION_STYLES: Record<
  OpenAiNarrationStyleId,
  OpenAiNarrationStyleMeta
> = {
  NEUTRAL_EDUCATIONAL: {
    slug: "calm-educational",
    label: "Calm educational",
    description:
      "Accent may vary depending on the selected OpenAI voice.",
    instructions:
      "Read in a calm, natural, intelligent educational documentary tone. Use clear pacing, thoughtful emphasis, and gentle pauses after headings and between sections. Read lists naturally. Avoid sounding theatrical, promotional, overly cheerful, or robotic.",
  },
  BRITISH_FEMALE_CALM: {
    slug: "british-leaning-educational",
    label: "British-leaning educational",
    description:
      "Requests British pronunciation where supported. Results may vary by voice.",
    instructions:
      "Read in a calm, natural educational documentary tone. Prefer clear British English pronunciation where the model supports it, including words such as philosophy, privacy, controversy, and schedule. Use thoughtful pacing and gentle pauses between sections. Do not claim a specific regional speaker identity. Avoid sounding theatrical, promotional, overly cheerful, or robotic.",
  },
  WARM_CONVERSATIONAL: {
    slug: "warm-conversational",
    label: "Warm conversational",
    description: "Accent may vary depending on the selected OpenAI voice.",
    instructions:
      "Speak in a warm, conversational tone with natural pacing and gentle emphasis. Sound approachable and thoughtful, like a knowledgeable friend explaining ideas clearly without sounding theatrical or promotional.",
  },
  CUSTOM: {
    slug: "custom",
    label: "Custom",
    description: "Your instructions. Accent and delivery depend on the voice and text.",
    instructions: "",
  },
};

export const MIXED_LANGUAGE_NARRATION_APPENDIX =
  "For mixed-language or Persian content: preserve the original language. Keep names and non-English phrases as natural as possible. Do not force an English regional accent onto non-English speech.";

export const BRITISH_LEANING_MIXED_LANGUAGE_APPENDIX =
  "For mixed-language or Persian content: preserve the original language. Apply British-leaning pronunciation guidance only to English portions where supported. Keep names and non-English phrases as natural as possible.";

export const NARRATION_CONTENT_PROFILES = {
  LIFE_LAB: "life-lab",
  COACHING: "coaching",
} as const;

export type NarrationContentProfile =
  (typeof NARRATION_CONTENT_PROFILES)[keyof typeof NARRATION_CONTENT_PROFILES];

export const NARRATION_CONTENT_PROFILE_VERSIONS: Record<
  NarrationContentProfile,
  number
> = {
  "life-lab": 5,
  coaching: 6,
};

/** @deprecated Use resolveNarrationInstructions() with a narration style instead. */
export const NARRATION_INSTRUCTIONS =
  OPENAI_NARRATION_STYLES.NEUTRAL_EDUCATIONAL.instructions;

export const OPENAI_NARRATION_CHUNK_MAX_CHARS = 3500;

export const OPENAI_NARRATION_MAX_INPUT_CHARS = 4096;

export const OPENAI_NARRATION_MAX_CONCURRENT_CHUNKS = 2;

export const LIFE_LAB_READ_ALOUD_PROVIDERS = {
  DEVICE: "DEVICE",
  OPENAI: "OPENAI",
} as const satisfies Record<string, LifeLabReadAloudProvider>;

export type LifeLabReadAloudProviderId =
  (typeof LIFE_LAB_READ_ALOUD_PROVIDERS)[keyof typeof LIFE_LAB_READ_ALOUD_PROVIDERS];

export const READ_ALOUD_PROVIDER_LABELS: Record<
  LifeLabReadAloudProviderId,
  { title: string; description: string }
> = {
  DEVICE: {
    title: "Device voice",
    description:
      "Uses voices available in your browser or operating system. On some devices, system voices can provide a more consistent regional accent than OpenAI.",
  },
  OPENAI: {
    title: "OpenAI narration",
    description:
      "Generates a more natural AI voice. Accent and delivery vary by voice. Audio is cached after generation.",
  },
};

export function isLifeLabReadAloudProvider(
  value: string,
): value is LifeLabReadAloudProviderId {
  return value === "DEVICE" || value === "OPENAI";
}

export function isOpenAiNarrationStyle(
  value: string,
): value is OpenAiNarrationStyleId {
  return OPENAI_NARRATION_STYLE_IDS.includes(value as OpenAiNarrationStyleId);
}

export function isSupportedOpenAiNarrationVoice(
  value: string,
): value is OpenAiNarrationVoiceId {
  return OPENAI_NARRATION_VOICES.some((voice) => voice.id === value);
}

export function isSuggestedOpenAiNarrationVoice(value: string): boolean {
  return (OPENAI_NARRATION_SUGGESTED_VOICES as readonly string[]).includes(value);
}
