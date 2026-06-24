import type {
  ExtractImageTextInput,
  ExtractImageTextResult,
  ImageDateHint,
} from "@/lib/ai/image-text-extraction-types";
import {
  DEFAULT_VISION_MODEL,
  getOpenAIClient,
} from "@/lib/ai/openai-client";
import { salvageTextFromModelResponse } from "@/lib/ai/salvage-model-text";
import { structureExtractedPlainText } from "@/lib/ai/structure-extracted-plain-text";
import { AI_USAGE_FEATURES, logAiUsage } from "@/lib/ai/usage";
import { EXTRACTION_TIMEOUT_MS } from "@/lib/image/constants";

const PLAIN_TEXT_EXTRACTION_PROMPT = `You are reading a handwritten planning note from a notebook photo.
Extract all readable text exactly as written.

Return plain text only. No JSON. No markdown fences. No commentary.
Preserve line breaks.
Preserve checkbox symbols (✅ ☐ ◐) if visible.
Preserve Persian and English text as written. Do not translate.
If something is unclear, use [?] for that word.
Do not invent text that is not visible.`;

export class ExtractionTimeoutError extends Error {
  constructor(
    message = "Extraction took too long. Try cropping the image closer to the note.",
  ) {
    super(message);
    this.name = "ExtractionTimeoutError";
  }
}

export type { ExtractImageTextInput, ExtractImageTextResult, ImageDateHint } from "@/lib/ai/image-text-extraction-types";

export type ExtractImageTextOptions = {
  timeoutMs?: number;
  userId?: string;
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(onTimeout());
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function stripResponseFences(content: string): string {
  let trimmed = content.trim().replace(/^\uFEFF/, "");
  const fencedMatch = trimmed.match(/```(?:json|text)?\s*([\s\S]*?)\s*```/i);

  if (fencedMatch) {
    trimmed = fencedMatch[1].trim();
  }

  return trimmed;
}

function normalizePlainTextResponse(content: string): {
  text: string;
  imperfect: boolean;
} {
  const stripped = stripResponseFences(content);

  if (stripped.startsWith("{")) {
    const salvaged = salvageTextFromModelResponse(stripped);
    if (salvaged) {
      return { text: salvaged, imperfect: true };
    }
  }

  return { text: stripped, imperfect: false };
}

async function fetchPlainTextFromVision(
  input: ExtractImageTextInput,
  userId?: string,
): Promise<string> {
  const openai = getOpenAIClient();
  const base64 = input.buffer.toString("base64");
  const dataUrl = `data:${input.mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_VISION_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PLAIN_TEXT_EXTRACTION_PROMPT },
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
    max_tokens: 2048,
  });

  if (userId) {
    void logAiUsage({
      userId,
      feature: AI_USAGE_FEATURES.IMAGE_IMPORT,
      model: response.model ?? DEFAULT_VISION_MODEL,
      usage: response.usage,
    });
  }

  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("No text could be extracted from the image.");
  }

  return content;
}

export async function extractImageText(
  input: ExtractImageTextInput,
  options: ExtractImageTextOptions = {},
): Promise<ExtractImageTextResult> {
  const timeoutMs = options.timeoutMs ?? EXTRACTION_TIMEOUT_MS;

  let rawContent: string;

  try {
    rawContent = await withTimeout(
      fetchPlainTextFromVision(input, options.userId),
      timeoutMs,
      () => new ExtractionTimeoutError(),
    );
  } catch (error) {
    if (error instanceof ExtractionTimeoutError) {
      throw error;
    }

    throw error;
  }

  const { text: plainText, imperfect: responseImperfect } =
    normalizePlainTextResponse(rawContent);

  if (!plainText.trim()) {
    const salvaged = salvageTextFromModelResponse(rawContent);
    if (!salvaged?.trim()) {
      throw new Error("No text could be extracted from the image.");
    }

    return {
      ...structureExtractedPlainText(salvaged),
      imperfect: true,
    };
  }

  try {
    return {
      ...structureExtractedPlainText(plainText),
      imperfect: responseImperfect || undefined,
    };
  } catch (structureError) {
    const salvaged = salvageTextFromModelResponse(rawContent);
    if (salvaged?.trim()) {
      return {
        ...structureExtractedPlainText(salvaged),
        imperfect: true,
      };
    }

    throw structureError;
  }
}
