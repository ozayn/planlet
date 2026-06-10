import type { PlanLanguage } from "@/app/generated/prisma/client";
import { z } from "zod";

import {
  type DateHintConfidence,
  mergeDateHintConfidence,
  resolveDateHint,
} from "@/lib/ai/date-hints";
import {
  DEFAULT_VISION_MODEL,
  getOpenAIClient,
} from "@/lib/ai/openai-client";
import { APP_TIMEZONE } from "@/config/time";

const EXTRACT_IMAGE_TEXT_PROMPT = `Extract written plan text and any visible date information from this image.

Return JSON only with this shape:
{
  "text": "extracted plan text",
  "language": "FA" | "EN" | "MIXED" | "UNKNOWN",
  "dateHint": {
    "detected": true | false,
    "rawText": "visible date phrase if any",
    "confidence": "LOW" | "MEDIUM" | "HIGH",
    "explanation": "short source note"
  }
}

Rules for text:
- Preserve line breaks when helpful.
- Preserve the original language. Do not translate.
- Do not summarize or rewrite.
- Do not infer missing tasks or content that is not visible.
- If handwriting is unclear, mark uncertain words with [?] or preserve your best guess.

Rules for dateHint:
- Look for visible dates anywhere in the image:
  - chat app date separators (Telegram, WhatsApp, iMessage, etc.)
  - handwritten dates
  - printed notebook dates
  - weekday names
  - relative words like today / tomorrow / امروز / فردا
- rawText should be the visible date phrase only, such as "08 June", "Jun 8", "Monday", or "امروز".
- Do not use plan-title weekday words as the date unless no stronger date is visible.
- If the year is missing, leave year out of rawText and lower confidence if needed.
- If there is a weekday conflict with a stronger month/day date, prefer the month/day date and explain the conflict.
- If no date is visible, set detected=false and omit rawText.
- explanation should be short, e.g. "Detected from chat header: 08 June".`;

const visionDateHintSchema = z.object({
  detected: z.boolean(),
  rawText: z.string().optional(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  explanation: z.string().optional(),
});

const visionResponseSchema = z.object({
  text: z.string().min(1),
  language: z.enum(["FA", "EN", "MIXED", "UNKNOWN"]).optional(),
  dateHint: visionDateHintSchema.optional(),
});

export type ImageDateHint = {
  detected: boolean;
  rawText?: string;
  dateString?: string;
  confidence: DateHintConfidence;
  explanation?: string;
};

export type ExtractImageTextInput = {
  buffer: Buffer;
  mimeType: string;
};

export type ExtractImageTextResult = {
  text: string;
  language: PlanLanguage;
  dateHint: ImageDateHint;
};

function inferLanguage(text: string): PlanLanguage {
  const persian = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;

  if (persian > 0 && latin > 0) {
    return "MIXED";
  }

  if (persian > latin) {
    return "FA";
  }

  if (latin > persian) {
    return "EN";
  }

  return persian > 0 ? "FA" : "UNKNOWN";
}

function finalizeDateHint(
  hint: z.infer<typeof visionDateHintSchema> | undefined,
  now = new Date(),
): ImageDateHint {
  if (!hint?.detected || !hint.rawText?.trim()) {
    return { detected: false, confidence: "LOW" };
  }

  const rawText = hint.rawText.trim();
  const resolved = resolveDateHint(rawText, now, APP_TIMEZONE);

  return {
    detected: true,
    rawText,
    dateString: resolved.dateString,
    confidence: mergeDateHintConfidence(hint.confidence, resolved.confidence),
    explanation: hint.explanation?.trim() || resolved.explanation,
  };
}

export async function extractImageText(
  input: ExtractImageTextInput,
): Promise<ExtractImageTextResult> {
  const openai = getOpenAIClient();
  const base64 = input.buffer.toString("base64");
  const dataUrl = `data:${input.mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_VISION_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: EXTRACT_IMAGE_TEXT_PROMPT },
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("No text could be extracted from the image.");
  }

  let json: unknown;

  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("Image extraction returned invalid JSON.");
  }

  const parsed = visionResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error("Image extraction returned an unexpected shape.");
  }

  const text = parsed.data.text.trim();

  if (!text) {
    throw new Error("No text could be extracted from the image.");
  }

  const language = parsed.data.language ?? inferLanguage(text);
  const dateHint = finalizeDateHint(parsed.data.dateHint);

  return {
    text,
    language,
    dateHint,
  };
}
