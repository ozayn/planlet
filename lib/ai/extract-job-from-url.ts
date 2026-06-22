import { z } from "zod";

import { DEFAULT_PARSE_MODEL, getOpenAIClient } from "@/lib/ai/openai-client";
import { isOpenAIConfigured } from "@/lib/env";

const MAX_FETCH_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 12_000;

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

function validateFetchUrl(url: string): URL {
  const parsed = new URL(url.trim());

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must start with http:// or https://.");
  }

  return parsed;
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

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "PlanletJobTracker/1.0 (+https://planlet.app; job-details-preview)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("Unsupported content type.");
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_FETCH_BYTES) {
      throw new Error("Page is too large to read.");
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const text = htmlToText(html);

    if (text.length < 80) {
      throw new Error("Not enough readable text on the page.");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractJobFromUrl(
  url: string,
): Promise<ExtractedJobDetails> {
  if (!isOpenAIConfigured()) {
    throw new Error("AI extraction is not configured.");
  }

  const parsedUrl = validateFetchUrl(url);
  const pageText = await fetchPageText(parsedUrl.toString());
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
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
        content: `URL: ${parsedUrl.toString()}\n\nPage text:\n${pageText}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No extraction result.");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("Could not parse extraction result.");
  }

  const parsed = extractedJobSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Could not parse extraction result.");
  }

  return parsed.data;
}
