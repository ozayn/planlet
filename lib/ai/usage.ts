import { prisma } from "@/lib/prisma";

export const AI_USAGE_FEATURES = {
  PLAN_PARSING: "plan_parsing",
  IMAGE_IMPORT: "image_import",
  COACHING_REFLECTION: "coaching_reflection",
  CAREER_REFLECTION: "career_reflection",
  JOB_URL_EXTRACTION: "job_url_extraction",
  AUDIO_TRANSCRIPTION: "audio_transcription",
  LIFE_LAB_NARRATION: "life_lab_narration",
} as const;

export type AiUsageFeature =
  (typeof AI_USAGE_FEATURES)[keyof typeof AI_USAGE_FEATURES];

export type AiUsageCounts = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LogAiUsageInput = {
  userId: string;
  feature: AiUsageFeature | string;
  model?: string | null;
  usage?: unknown;
};

const AI_USAGE_FEATURE_LABELS: Record<string, string> = {
  [AI_USAGE_FEATURES.PLAN_PARSING]: "Plan parsing",
  [AI_USAGE_FEATURES.IMAGE_IMPORT]: "Import",
  [AI_USAGE_FEATURES.COACHING_REFLECTION]: "Coaching",
  [AI_USAGE_FEATURES.CAREER_REFLECTION]: "Career reflection",
  [AI_USAGE_FEATURES.JOB_URL_EXTRACTION]: "Job tracker",
  [AI_USAGE_FEATURES.AUDIO_TRANSCRIPTION]: "Audio transcription",
  [AI_USAGE_FEATURES.LIFE_LAB_NARRATION]: "Life Lab narration",
};

export function getAiUsageFeatureLabel(feature: string): string {
  return AI_USAGE_FEATURE_LABELS[feature] ?? feature;
}

export function normalizeAiUsage(usage: unknown): AiUsageCounts {
  if (!usage || typeof usage !== "object") {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  const record = usage as Record<string, number | undefined>;

  if ("prompt_tokens" in record || "completion_tokens" in record) {
    const promptTokens = record.prompt_tokens ?? 0;
    const completionTokens = record.completion_tokens ?? 0;
    const totalTokens =
      record.total_tokens ?? promptTokens + completionTokens;

    return { promptTokens, completionTokens, totalTokens };
  }

  if ("input_tokens" in record || "output_tokens" in record) {
    const promptTokens = record.input_tokens ?? 0;
    const completionTokens = record.output_tokens ?? 0;

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

export async function logAiUsage(input: LogAiUsageInput): Promise<void> {
  try {
    const normalized = normalizeAiUsage(input.usage);

    await prisma.aiUsageLog.create({
      data: {
        userId: input.userId,
        feature: input.feature,
        model: input.model ?? null,
        promptTokens: normalized.promptTokens,
        completionTokens: normalized.completionTokens,
        totalTokens: normalized.totalTokens,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ai-usage]", error);
    }
  }
}

export type AiUsageContext = {
  userId: string;
  feature: AiUsageFeature | string;
};
