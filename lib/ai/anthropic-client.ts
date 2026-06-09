import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicApiKey } from "@/lib/env";

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  client ??= new Anthropic({ apiKey });
  return client;
}
