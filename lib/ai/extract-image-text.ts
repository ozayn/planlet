import type { PlanLanguage } from "@/app/generated/prisma/client";

import {
  DEFAULT_VISION_MODEL,
  getOpenAIClient,
} from "@/lib/ai/openai-client";

const EXTRACT_IMAGE_TEXT_PROMPT = `Extract only the written text from this image.

Rules:
- Preserve line breaks when helpful.
- Preserve the original language. Do not translate.
- Do not summarize or rewrite.
- Do not infer missing tasks or content that is not visible.
- If handwriting is unclear, mark uncertain words with [?] or preserve your best guess.
- Return plain text only. No markdown fences or commentary.`;

export type ExtractImageTextInput = {
  buffer: Buffer;
  mimeType: string;
};

export type ExtractImageTextResult = {
  text: string;
  language?: PlanLanguage;
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

export async function extractImageText(
  input: ExtractImageTextInput,
): Promise<ExtractImageTextResult> {
  const openai = getOpenAIClient();
  const base64 = input.buffer.toString("base64");
  const dataUrl = `data:${input.mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_VISION_MODEL,
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

  const text = response.choices[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("No text could be extracted from the image.");
  }

  return {
    text,
    language: inferLanguage(text),
  };
}
