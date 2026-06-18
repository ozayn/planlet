import { getAnthropicClient } from "@/lib/ai/anthropic-client";
import { COACHING_REFLECTION_SYSTEM_PROMPT } from "@/lib/ai/coaching-reflection-prompt";
import {
  validateCoachingReflection,
  type CoachingReflection,
} from "@/lib/ai/coaching-reflection-schema";
import { DEFAULT_PARSE_MODEL, getOpenAIClient } from "@/lib/ai/openai-client";
import { parseModelJsonResponse } from "@/lib/ai/parse-model-json";
import { buildReflectionInfluencePromptSection } from "@/lib/reflection-influences";
import type { ReflectionInfluenceId } from "@/lib/reflection-influences";
import { getPlanletAiProvider, getAnthropicModel } from "@/lib/env";

type GenerateCoachingReflectionInput = {
  context: string;
  influenceIds: ReflectionInfluenceId[];
};

function buildUserPrompt(input: GenerateCoachingReflectionInput): string {
  const influenceSection = buildReflectionInfluencePromptSection(
    input.influenceIds,
  );

  return [
    influenceSection,
    "Here is the user's month in their own words and counts:",
    input.context,
    "",
    "Write one reflection, one question, and one small experiment.",
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

  return validateCoachingReflection(JSON.parse(content));
}

async function generateWithAnthropic(
  input: GenerateCoachingReflectionInput,
): Promise<CoachingReflection> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: getAnthropicModel(),
    max_tokens: 1024,
    temperature: 0.5,
    system: COACHING_REFLECTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
    throw new Error("No reflection was generated.");
  }

  return validateCoachingReflection(
    parseModelJsonResponse(
      textBlock.text,
      "Reflection response was invalid JSON.",
    ),
  );
}

export async function generateCoachingReflection(
  input: GenerateCoachingReflectionInput,
): Promise<CoachingReflection> {
  if (input.influenceIds.length === 0) {
    throw new Error("Choose at least one reflection influence in Settings.");
  }

  if (getPlanletAiProvider() === "anthropic") {
    return generateWithAnthropic(input);
  }

  return generateWithOpenAI(input);
}
