import { DEFAULT_PARSE_MODEL, getOpenAIClient } from "@/lib/ai/openai-client";
import { PLAN_PARSE_SYSTEM_PROMPT } from "@/lib/ai/parse-plan-prompt";
import {
  validateParsedPlan,
  type ParsedPlan,
} from "@/lib/ai/plan-parser-schema";
import { logAiUsage } from "@/lib/ai/usage";
import type { AiUsageContext } from "@/lib/ai/usage";

export type ParsePlanFromTextInput = {
  text: string;
  usageContext?: AiUsageContext;
};

export async function parsePlanFromTextOpenAI(
  input: ParsePlanFromTextInput,
): Promise<ParsedPlan> {
  const text = input.text.trim();

  if (!text) {
    throw new Error("Text is required");
  }

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: DEFAULT_PARSE_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PLAN_PARSE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Structure this plan text:\n\n${text}`,
      },
    ],
  });

  if (input.usageContext) {
    void logAiUsage({
      userId: input.usageContext.userId,
      feature: input.usageContext.feature,
      model: response.model ?? DEFAULT_PARSE_MODEL,
      usage: response.usage,
    });
  }

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from the parser");
  }

  let json: unknown;

  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("Parser returned invalid JSON");
  }

  return validateParsedPlan(json);
}
