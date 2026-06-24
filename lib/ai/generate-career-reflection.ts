import { getAnthropicClient } from "@/lib/ai/anthropic-client";
import { CAREER_REFLECTION_SYSTEM_PROMPT } from "@/lib/ai/career-reflection-prompt";
import {
  validateCareerReflection,
  type CareerReflection,
} from "@/lib/ai/career-reflection-schema";
import { DEFAULT_PARSE_MODEL, getOpenAIClient } from "@/lib/ai/openai-client";
import { parseModelJsonResponse } from "@/lib/ai/parse-model-json";
import { AI_USAGE_FEATURES, logAiUsage, type AiUsageContext } from "@/lib/ai/usage";
import { getPlanletAiProvider, getAnthropicModel } from "@/lib/env";

type GenerateCareerReflectionInput = {
  context: string;
  usageContext?: AiUsageContext;
};

async function generateWithOpenAI(
  input: GenerateCareerReflectionInput,
): Promise<CareerReflection> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: DEFAULT_PARSE_MODEL,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CAREER_REFLECTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          "Here is the user's career journey activity:",
          input.context,
          "",
          "Write one gentle career reflection and one next kind action.",
        ].join("\n"),
      },
    ],
  });

  if (input.usageContext) {
    void logAiUsage({
      userId: input.usageContext.userId,
      feature: input.usageContext.feature ?? AI_USAGE_FEATURES.CAREER_REFLECTION,
      model: response.model ?? DEFAULT_PARSE_MODEL,
      usage: response.usage,
    });
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No career reflection was generated.");
  }

  return validateCareerReflection(JSON.parse(content));
}

async function generateWithAnthropic(
  input: GenerateCareerReflectionInput,
): Promise<CareerReflection> {
  const anthropic = getAnthropicClient();
  const model = getAnthropicModel();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    temperature: 0.5,
    system: CAREER_REFLECTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          "Here is the user's career journey activity:",
          input.context,
          "",
          "Write one gentle career reflection and one next kind action.",
        ].join("\n"),
      },
    ],
  });

  if (input.usageContext) {
    void logAiUsage({
      userId: input.usageContext.userId,
      feature: input.usageContext.feature ?? AI_USAGE_FEATURES.CAREER_REFLECTION,
      model: response.model ?? model,
      usage: response.usage,
    });
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
    throw new Error("No career reflection was generated.");
  }

  return validateCareerReflection(
    parseModelJsonResponse(
      textBlock.text,
      "Career reflection response was invalid JSON.",
    ),
  );
}

export async function generateCareerReflection(
  input: GenerateCareerReflectionInput,
): Promise<CareerReflection> {
  if (getPlanletAiProvider() === "anthropic") {
    return generateWithAnthropic(input);
  }

  return generateWithOpenAI(input);
}
