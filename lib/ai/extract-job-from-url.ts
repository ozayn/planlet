import { z } from "zod";

import { DEFAULT_PARSE_MODEL, getOpenAIClient } from "@/lib/ai/openai-client";
import { isOpenAIConfigured } from "@/lib/env";

const MAX_FETCH_BYTES = 500_000;
const EXTRACT_TIMEOUT_MS = 10_000;
const FETCH_TIMEOUT_MS = 8_000;
const LINKEDIN_FETCH_TIMEOUT_MS = 6_000;
const AI_TIMEOUT_MS = 6_000;
const MAX_TEXT_CHARS = 12_000;

export const JOB_URL_EXTRACT_FAILURE_MESSAGE =
  "Couldn't read this page. You can still enter the job details manually.";

export type ExtractedJobDetails = {
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  summary?: string;
  likelySkills?: string[];
  applicationDeadline?: string;
};

export type ExtractJobFromUrlResult =
  | { ok: true; details: ExtractedJobDetails }
  | { ok: false; message: string };

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

function validateFetchUrl(url: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("invalid url");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("invalid url");
  }

  return parsed;
}

function isLinkedInJobUrl(url: URL): boolean {
  return url.hostname.toLowerCase().includes("linkedin.com");
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function hasExtractedContent(details: ExtractedJobDetails): boolean {
  return Boolean(
    details.title?.trim() ||
      details.company?.trim() ||
      details.location?.trim() ||
      details.salary?.trim() ||
      details.description?.trim() ||
      details.summary?.trim() ||
      details.applicationDeadline?.trim() ||
      (details.likelySkills?.length ?? 0) > 0,
  );
}

async function fetchPageText(url: URL): Promise<string> {
  const timeoutMs = isLinkedInJobUrl(url)
    ? LINKEDIN_FETCH_TIMEOUT_MS
    : FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "PlanletJobTracker/1.0 (+https://planlet.app; job-details-preview)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error("fetch failed");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain")
    ) {
      throw new Error("unsupported content type");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_FETCH_BYTES) {
      throw new Error("page too large");
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const text = htmlToText(html);

    if (text.length < 80) {
      throw new Error("not enough text");
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("fetch timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function extractDetailsWithAi(
  pageUrl: string,
  pageText: string,
): Promise<ExtractedJobDetails> {
  if (!isOpenAIConfigured()) {
    throw new Error("ai not configured");
  }

  const openai = getOpenAIClient();

  const response = await withTimeout(
    openai.chat.completions.create({
      model: DEFAULT_PARSE_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract structured job posting details from page text. Return a JSON object with optional keys: title, company, location, salary, description, summary, likelySkills (string array), applicationDeadline. Do not invent details that are not supported by the text. Keep description concise but useful. Summary should be 1-2 sentences.",
        },
        {
          role: "user",
          content: `URL: ${pageUrl}\n\nPage text:\n${pageText}`,
        },
      ],
    }),
    AI_TIMEOUT_MS,
  );

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("empty ai response");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("invalid ai json");
  }

  const parsed = extractedJobSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("invalid ai shape");
  }

  return parsed.data;
}

async function extractJobFromUrlInternal(url: string): Promise<ExtractedJobDetails> {
  const parsedUrl = validateFetchUrl(url);
  const pageText = await fetchPageText(parsedUrl);
  return extractDetailsWithAi(parsedUrl.toString(), pageText);
}

export async function extractJobFromUrlSafe(
  url: string,
): Promise<ExtractJobFromUrlResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, message: JOB_URL_EXTRACT_FAILURE_MESSAGE };
  }

  try {
    const details = await withTimeout(
      extractJobFromUrlInternal(trimmed),
      EXTRACT_TIMEOUT_MS,
    );

    if (!hasExtractedContent(details)) {
      return { ok: false, message: JOB_URL_EXTRACT_FAILURE_MESSAGE };
    }

    return { ok: true, details };
  } catch {
    return { ok: false, message: JOB_URL_EXTRACT_FAILURE_MESSAGE };
  }
}

/** @deprecated Use extractJobFromUrlSafe for graceful error handling. */
export async function extractJobFromUrl(
  url: string,
): Promise<ExtractedJobDetails> {
  const result = await extractJobFromUrlSafe(url);
  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.details;
}
