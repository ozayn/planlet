import { getAnthropicClient } from "@/lib/ai/anthropic-client";
import { parseModelJsonResponse } from "@/lib/ai/parse-model-json";
import { PLAN_PARSE_SYSTEM_PROMPT } from "@/lib/ai/parse-plan-prompt";
import {
  validateParsedPlan,
  type ParsedPlan,
} from "@/lib/ai/plan-parser-schema";
import { getAnthropicModel } from "@/lib/env";

export type ParsePlanFromTextInput = {
  text: string;
};

export async function parsePlanFromTextAnthropic(
  input: ParsePlanFromTextInput,
): Promise<ParsedPlan> {
  const text = input.text.trim();

  if (!text) {
    throw new Error("Text is required");
  }

  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: getAnthropicModel(),
    max_tokens: 4096,
    temperature: 0.2,
    system: PLAN_PARSE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Structure this plan text:\n\n${text}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
    throw new Error("No response from the parser");
  }

  const json = parseModelJsonResponse(
    textBlock.text,
    "Parser returned invalid JSON",
  );
  return validateParsedPlan(json);
}
