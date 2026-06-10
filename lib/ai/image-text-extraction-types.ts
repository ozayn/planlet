import type { PlanLanguage } from "@/app/generated/prisma/client";

import type { DateHintConfidence } from "@/lib/ai/date-hints";
import type { ImageItemHint } from "@/lib/ai/image-extraction-format";

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
  imperfect?: boolean;
};
