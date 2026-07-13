import type { LifeLabReadAloudProvider } from "@/app/generated/prisma/client";

export const NARRATION_INSTRUCTION_VERSION = 3;

export const NARRATION_PREVIEW_TEXT =
  "Personal identity asks what allows a person to remain the same over time. Philosophers disagree about whether continuity depends on the body, the mind, memory, or the soul.";

export const OPENAI_NARRATION_VOICES = [
  { id: "marin", label: "Marin" },
  { id: "shimmer", label: "Shimmer" },
  { id: "coral", label: "Coral" },
  { id: "nova", label: "Nova" },
  { id: "fable", label: "Fable" },
  { id: "cedar", label: "Cedar" },
  { id: "alloy", label: "Alloy" },
  { id: "echo", label: "Echo" },
  { id: "sage", label: "Sage" },
] as const;

export type OpenAiNarrationVoiceId =
  (typeof OPENAI_NARRATION_VOICES)[number]["id"];

export const OPENAI_NARRATION_STYLE_IDS = [
  "BRITISH_FEMALE_CALM",
  "NEUTRAL_EDUCATIONAL",
  "WARM_CONVERSATIONAL",
  "CUSTOM",
] as const;

export type OpenAiNarrationStyleId = (typeof OPENAI_NARRATION_STYLE_IDS)[number];

export const OPENAI_NARRATION_STYLES: Record<
  OpenAiNarrationStyleId,
  { slug: string; label: string; instructions: string }
> = {
  BRITISH_FEMALE_CALM: {
    slug: "british-female-calm",
    label: "British female — calm",
    instructions:
      "Speak in a natural, warm British female voice. Use clear standard British English pronunciation, calm pacing, thoughtful intonation, and gentle pauses between sections. Sound like an intelligent educational documentary narrator. Avoid sounding theatrical, promotional, overly cheerful, or robotic. For English words such as philosophy, privacy, controversy, and schedule, use British pronunciation.",
  },
  NEUTRAL_EDUCATIONAL: {
    slug: "neutral-educational",
    label: "Neutral educational",
    instructions:
      "Read in a calm, natural, intelligent educational tone. Use clear pauses between headings and avoid sounding promotional.",
  },
  WARM_CONVERSATIONAL: {
    slug: "warm-conversational",
    label: "Warm conversational",
    instructions:
      "Speak in a warm, conversational tone with natural pacing and gentle emphasis. Sound approachable and thoughtful, like a knowledgeable friend explaining ideas clearly without sounding theatrical or promotional.",
  },
  CUSTOM: {
    slug: "custom",
    label: "Custom",
    instructions: "",
  },
};

export const MIXED_LANGUAGE_NARRATION_APPENDIX =
  "For mixed-language or Persian content: preserve the original language. Do not force a British accent onto non-English speech. Apply the British delivery instruction only to English portions. Keep names and non-English phrases as natural as possible.";

/** @deprecated Use resolveNarrationInstructions() with a narration style instead. */
export const NARRATION_INSTRUCTIONS =
  OPENAI_NARRATION_STYLES.BRITISH_FEMALE_CALM.instructions;

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
      "Uses voices available in your browser or operating system.",
  },
  OPENAI: {
    title: "OpenAI narration",
    description:
      "Generates a more natural AI voice. Audio is cached after generation.",
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
