import { z } from "zod";

import {
  type ExtractedJobDetails,
  type ExtractJobResult,
  extractDetailsWithAi,
  hasExtractedContent,
  JOB_EXTRACT_FAILURE_MESSAGE,
} from "@/lib/ai/extract-job-from-url";

const MAX_PASTE_CHARS = 20_000;
const EXTRACT_TIMEOUT_MS = 10_000;

const extractedJobSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  likelySkills: z.array(z.string()).optional(),
  applicationDeadline: z.string().optional(),
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function extractJobFromTextInternal(
  text: string,
  sourceUrl: string | undefined,
  userId?: string,
): Promise<ExtractedJobDetails> {
  const trimmed = text.trim().slice(0, MAX_PASTE_CHARS);
  if (trimmed.length < 40) {
    throw new Error("not enough text");
  }

  const context = sourceUrl?.trim()
    ? `Source URL: ${sourceUrl.trim()}\n\nPasted job text:\n${trimmed}`
    : `Pasted job text:\n${trimmed}`;

  const details = await extractDetailsWithAi(
    sourceUrl?.trim() || "pasted-job-text",
    context,
    userId,
    "Extract structured job posting details from pasted job text. Return a JSON object with optional keys: title, company, location, salary, description, summary, likelySkills (string array), applicationDeadline. Do not invent details that are not supported by the text. Keep description concise but useful. Summary should be 1-2 sentences.",
  );

  const parsed = extractedJobSchema.safeParse(details);
  if (!parsed.success) {
    throw new Error("invalid ai shape");
  }

  return parsed.data;
}

export async function extractJobFromTextSafe(
  text: string,
  sourceUrl?: string,
  userId?: string,
): Promise<ExtractJobResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, message: JOB_EXTRACT_FAILURE_MESSAGE };
  }

  try {
    const details = await withTimeout(
      extractJobFromTextInternal(trimmed, sourceUrl, userId),
      EXTRACT_TIMEOUT_MS,
    );

    if (!hasExtractedContent(details)) {
      return { ok: false, message: JOB_EXTRACT_FAILURE_MESSAGE };
    }

    return { ok: true, details };
  } catch {
    return { ok: false, message: JOB_EXTRACT_FAILURE_MESSAGE };
  }
}
