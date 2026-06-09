import { getAnthropicClient } from "@/lib/ai/anthropic-client";
import { PLAN_PARSE_SYSTEM_PROMPT } from "@/lib/ai/parse-plan-prompt";
import {
  validateParsedPlan,
  type ParsedPlan,
} from "@/lib/ai/plan-parser-schema";
import { getAnthropicModel } from "@/lib/env";

export type ParsePlanFromTextInput = {
  text: string;
};

function extractJsonFromText(content: string): unknown {
  let trimmed = content.trim();

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    trimmed = fenced[1].trim();
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        throw new Error("Parser returned invalid JSON");
      }
    }

    throw new Error("Parser returned invalid JSON");
  }
}

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

  const json = extractJsonFromText(textBlock.text);
  return validateParsedPlan(json);
}
