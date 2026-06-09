import { parsePlanFromTextAnthropic } from "@/lib/ai/parse-plan-anthropic";
import { parsePlanFromTextOpenAI } from "@/lib/ai/parse-plan-openai";
import type { ParsedPlan } from "@/lib/ai/plan-parser-schema";
import { getPlanletAiProvider } from "@/lib/env";

export type ParsePlanFromTextInput = {
  text: string;
};

export async function parsePlanFromText(
  input: ParsePlanFromTextInput,
): Promise<ParsedPlan> {
  const provider = getPlanletAiProvider();

  if (provider === "anthropic") {
    return parsePlanFromTextAnthropic(input);
  }

  return parsePlanFromTextOpenAI(input);
}
