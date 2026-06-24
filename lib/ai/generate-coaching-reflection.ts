import { getAnthropicClient } from "@/lib/ai/anthropic-client";
import { COACHING_REFLECTION_SYSTEM_PROMPT } from "@/lib/ai/coaching-reflection-prompt";
import {
  validateCoachingReflection,
  type CoachingReflection,
} from "@/lib/ai/coaching-reflection-schema";
import { DEFAULT_PARSE_MODEL, getOpenAIClient } from "@/lib/ai/openai-client";
import { parseModelJsonResponse } from "@/lib/ai/parse-model-json";
import {
  AI_USAGE_FEATURES,
  logAiUsage,
  type AiUsageContext,
} from "@/lib/ai/usage";
import {
  buildReflectionInfluencePromptSection,
  getAllSelectedInfluenceIds,
  type ReflectionInfluencePreferences,
} from "@/lib/reflection-influences";
import { getPlanletAiProvider, getAnthropicModel } from "@/lib/env";

type GenerateCoachingReflectionInput = {
  context: string;
  preferences: ReflectionInfluencePreferences;
  usageContext?: AiUsageContext;
};

function buildUserPrompt(input: GenerateCoachingReflectionInput): string {
  const influenceSection = buildReflectionInfluencePromptSection(
    input.preferences,
  );

  return [
    influenceSection,
    "Here is the user's planning activity in their own words and counts:",
    input.context,
    "",
    "Write one reflection (150–300 words), one question, and one small experiment.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function generateWithOpenAI(
  input: GenerateCoachingReflectionInput,
): Promise<CoachingReflection> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: DEFAULT_PARSE_MODEL,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: COACHING_REFLECTION_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No reflection was generated.");
  }

  const reflection = validateCoachingReflection(JSON.parse(content));

  if (input.usageContext) {
    void logAiUsage({
      userId: input.usageContext.userId,
      feature:
        input.usageContext.feature ?? AI_USAGE_FEATURES.COACHING_REFLECTION,
      model: response.model ?? DEFAULT_PARSE_MODEL,
      usage: response.usage,
    });
  }

  return reflection;
}

async function generateWithAnthropic(
  input: GenerateCoachingReflectionInput,
): Promise<CoachingReflection> {
  const anthropic = getAnthropicClient();
  const model = getAnthropicModel();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    temperature: 0.5,
    system: COACHING_REFLECTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
    throw new Error("No reflection was generated.");
  }

  const reflection = validateCoachingReflection(
    parseModelJsonResponse(
      textBlock.text,
      "Reflection response was invalid JSON.",
    ),
  );

  if (input.usageContext) {
    void logAiUsage({
      userId: input.usageContext.userId,
      feature:
        input.usageContext.feature ?? AI_USAGE_FEATURES.COACHING_REFLECTION,
      model: response.model ?? model,
      usage: response.usage,
    });
  }

  return reflection;
}

export async function generateCoachingReflection(
  input: GenerateCoachingReflectionInput,
): Promise<CoachingReflection> {
  if (getAllSelectedInfluenceIds(input.preferences).length === 0) {
    throw new Error("Choose at least one reflection influence in Settings.");
  }

  if (getPlanletAiProvider() === "anthropic") {
    return generateWithAnthropic(input);
  }

  return generateWithOpenAI(input);
}
