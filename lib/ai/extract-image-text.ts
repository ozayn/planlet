import type { PlanLanguage } from "@/app/generated/prisma/client";
import { z } from "zod";

import {
  type DateHintConfidence,
  mergeDateHintConfidence,
  resolveDateHint,
} from "@/lib/ai/date-hints";
import {
  buildTextareaContentFromExtraction,
  type ImageItemHint,
} from "@/lib/ai/image-extraction-format";
import {
  DEFAULT_VISION_MODEL,
  getOpenAIClient,
} from "@/lib/ai/openai-client";
import { parseModelJsonResponse } from "@/lib/ai/parse-model-json";
import { APP_TIMEZONE } from "@/config/time";

const EXTRACT_IMAGE_TEXT_PROMPT = `You are reading a handwritten planning note from a real notebook photo.
Extract only useful planning content. Do not expect perfect OCR.

Return valid JSON only. Do not wrap the JSON in markdown code fences.
Use this shape:
{
  "text": "cleaned plan text for a notes textarea",
  "language": "FA" | "EN" | "MIXED" | "UNKNOWN",
  "dateHint": {
    "detected": true | false,
    "rawText": "strongest visible date phrase or null",
    "confidence": "LOW" | "MEDIUM" | "HIGH",
    "explanation": "short source note or null"
  },
  "removedHeaderLines": ["header lines removed from tasks"],
  "possibleTitle": "best title/context phrase or null",
  "multipleDateSectionsDetected": true | false,
  "itemHints": [
    {
      "text": "item text without checkbox symbols",
      "status": "OPEN" | "DONE" | "PARTIAL" | "MOVED" | "SKIPPED" | "RELEASED" | "UNKNOWN",
      "type": "TASK" | "NOTE" | "INTENTION" | "UNKNOWN",
      "dateRawText": "section date label such as جون ۸ or null",
      "confidence": "LOW" | "MEDIUM" | "HIGH"
    }
  ]
}

Pay attention to:

1. Dates or section headers:
   - جون ۸, جون ۹, June 8, June 9
   - today / tomorrow / امروز / فردا
   - weekday names
   - chat app date separators when present
   These are date/title/context, not tasks.

2. Checkboxes and marks:
   - empty checkbox → status OPEN
   - checked checkbox or checkmark → status DONE
   - crossed-out item → DONE if clearly checked off, otherwise UNKNOWN
   - do not include checkbox symbols inside item text

3. Mixed language:
   - Preserve words like Claude Code, Expo Print, FIQ exactly if readable
   - Keep Persian text Persian
   - Do not translate

4. Layout:
   - Read right-to-left Persian lists correctly
   - If multiple dated sections exist, keep them separated in itemHints using dateRawText
   - Set multipleDateSectionsDetected=true when more than one date section is visible
   - If layout is ambiguous, preserve line breaks and mark uncertain parts with [?]
   - Do not invent tasks from arrows or scribbles; uncertain scribbles may be NOTE with UNKNOWN type

5. Do not treat headers as tasks:
   - جون ۸, جون ۹, برنامه دوشنبه, امروز واقعا
   Put these in removedHeaderLines, possibleTitle, or dateRawText — not as task itemHints.

6. Quality rules:
   - Preserve original language. Do not translate.
   - Do not invent missing words.
   - Mark uncertain handwriting with [?].
   - Do not summarize or rewrite planning content.
   - text should be the cleaned textarea version with headers removed and checkbox symbols stripped.
   - itemHints should list actual planning lines in reading order when you can identify them.

Rules for dateHint:
- Use the strongest single date for the overall image (prefer month/day over weekday alone).
- If multiple dates appear, still pick the strongest primary date for dateHint and set multipleDateSectionsDetected=true.
- If no date is visible, set detected=false and rawText=null.
- explanation should be short, e.g. "Detected from notebook header: جون ۸".`;

const visionDateHintSchema = z.object({
  detected: z.boolean(),
  rawText: z.string().nullable().optional(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  explanation: z.string().nullable().optional(),
});

const visionItemHintSchema = z.object({
  text: z.string().min(1),
  status: z
    .enum([
      "OPEN",
      "DONE",
      "PARTIAL",
      "MOVED",
      "SKIPPED",
      "RELEASED",
      "UNKNOWN",
    ])
    .optional(),
  type: z.enum(["TASK", "NOTE", "INTENTION", "UNKNOWN"]).optional(),
  dateRawText: z.string().nullable().optional(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

const visionResponseSchema = z.object({
  text: z.string().min(1),
  language: z.enum(["FA", "EN", "MIXED", "UNKNOWN"]).optional(),
  dateHint: visionDateHintSchema.optional(),
  removedHeaderLines: z.array(z.string()).optional(),
  possibleTitle: z.string().nullable().optional(),
  multipleDateSectionsDetected: z.boolean().optional(),
  itemHints: z.array(visionItemHintSchema).optional(),
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
  removedHeaderLines: string[];
  possibleTitle?: string;
  itemHints: ImageItemHint[];
  multipleDateSectionsDetected: boolean;
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
  const rawText = hint?.rawText?.trim();

  if (!hint?.detected || !rawText) {
    return { detected: false, confidence: "LOW" };
  }

  const resolved = resolveDateHint(rawText, now, APP_TIMEZONE);

  return {
    detected: true,
    rawText,
    dateString: resolved.dateString,
    confidence: mergeDateHintConfidence(hint.confidence, resolved.confidence),
    explanation: hint.explanation?.trim() || resolved.explanation,
  };
}

function normalizeItemHints(
  hints: z.infer<typeof visionItemHintSchema>[] | undefined,
): ImageItemHint[] {
  if (!hints?.length) {
    return [];
  }

  return hints
    .map((hint) => ({
      text: hint.text.trim(),
      status: hint.status ?? "UNKNOWN",
      type: hint.type ?? "UNKNOWN",
      dateRawText: hint.dateRawText?.trim() || undefined,
      confidence: hint.confidence,
    }))
    .filter((hint) => hint.text.length > 0);
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

  const json = parseModelJsonResponse(
    content,
    "Image extraction returned invalid JSON.",
  );

  const parsed = visionResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error("Image extraction returned an unexpected shape.");
  }

  const removedHeaderLines = (parsed.data.removedHeaderLines ?? [])
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const itemHints = normalizeItemHints(parsed.data.itemHints);
  const dateHint = finalizeDateHint(parsed.data.dateHint);

  const text = buildTextareaContentFromExtraction({
    text: parsed.data.text.trim(),
    removedHeaderLines,
    possibleTitle: parsed.data.possibleTitle,
    itemHints,
    multipleDateSectionsDetected: parsed.data.multipleDateSectionsDetected,
  });

  if (!text) {
    throw new Error("No text could be extracted from the image.");
  }

  const language = parsed.data.language ?? inferLanguage(text);

  const multipleDateSectionsDetected =
    parsed.data.multipleDateSectionsDetected ??
    (removedHeaderLines.length > 1 ||
      itemHints.filter((hint) => hint.dateRawText).length > 1);

  return {
    text,
    language,
    dateHint,
    removedHeaderLines,
    possibleTitle: parsed.data.possibleTitle?.trim() || undefined,
    itemHints,
    multipleDateSectionsDetected,
  };
}
