import OpenAI from "openai";

import { getOpenAITranscribeModel } from "@/lib/env";

let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  client ??= new OpenAI({ apiKey });
  return client;
}

export const DEFAULT_PARSE_MODEL = "gpt-4o-mini";

export const DEFAULT_TRANSCRIBE_MODEL = getOpenAITranscribeModel();
