import type { LifeLabReadAloudProvider } from "@/app/generated/prisma/client";

export const NARRATION_INSTRUCTION_VERSION = 2;

export const NARRATION_INSTRUCTIONS =
  "Read in a calm, natural, intelligent educational tone. Use clear pauses between headings and avoid sounding promotional.";

export const OPENAI_NARRATION_CHUNK_MAX_CHARS = 3500;

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
