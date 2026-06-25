import { z } from "zod";

import { DEFAULT_PARSE_MODEL, getOpenAIClient } from "@/lib/ai/openai-client";
import type { ExtractedJobDetails } from "@/lib/ai/extracted-job-details";
import { hasExtractedContent } from "@/lib/ai/extracted-job-details";
import { AI_USAGE_FEATURES, logAiUsage } from "@/lib/ai/usage";
import { isOpenAIConfigured } from "@/lib/env";
import {
  canonicalizeLinkedInJobUrl,
  extractLinkedInSlugDetails,
  isLinkedInJobUrl,
  linkedInSlugToJobFields,
} from "@/lib/linkedin-job-url";
import { normalizeJobUrlForStorage } from "@/lib/job-url-normalization";

const MAX_FETCH_BYTES = 500_000;
const EXTRACT_TIMEOUT_MS = 10_000;
const FETCH_TIMEOUT_MS = 8_000;
const LINKEDIN_FETCH_TIMEOUT_MS = 6_000;
const AI_TIMEOUT_MS = 6_000;
const MAX_TEXT_CHARS = 12_000;

export const JOB_URL_EXTRACT_FAILURE_MESSAGE =
  "Couldn't read this page. You can still enter the job details manually.";

export const JOB_EXTRACT_FAILURE_MESSAGE = JOB_URL_EXTRACT_FAILURE_MESSAGE;

export const LINKEDIN_BLOCKED_ID_ONLY_MESSAGE =
  "LinkedIn often blocks automatic reading. I saved the job link, but this URL only contains the job ID. Paste the job description below and I can extract the title, company, skills, and summary.";

export const LINKEDIN_BLOCKED_SLUG_MESSAGE =
  "LinkedIn blocked the full page, but I extracted what I could from the URL. Paste the job description below if you want a better summary.";

/** @deprecated Use LINKEDIN_BLOCKED_ID_ONLY_MESSAGE or LINKEDIN_BLOCKED_SLUG_MESSAGE */
export const LINKEDIN_EXTRACT_BLOCKED_MESSAGE = LINKEDIN_BLOCKED_ID_ONLY_MESSAGE;

export type { ExtractedJobDetails } from "@/lib/ai/extracted-job-details";
export { hasExtractedContent } from "@/lib/ai/extracted-job-details";

export type ExtractJobResult =
  | {
      ok: true;
      details: ExtractedJobDetails;
      canonicalUrl?: string;
    }
  | {
      ok: false;
      message: string;
      code?: "linkedin_blocked" | "generic";
      canonicalUrl?: string;
      suggestPasteFallback?: boolean;
      details?: ExtractedJobDetails;
    };

/** @deprecated Use ExtractJobResult */
export type ExtractJobFromUrlResult = ExtractJobResult;

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

type PageMetadata = {
  title?: string;
  description?: string;
  jsonLdSnippets: string[];
};

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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function readMetaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return undefined;
}

function readDocumentTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]) : undefined;
}

function readJsonLdSnippets(html: string): string[] {
  const snippets: string[] = [];
  const pattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    const snippet = match[1]?.trim();
    if (snippet) {
      snippets.push(snippet.slice(0, 4000));
    }
  }

  return snippets.slice(0, 3);
}

function extractPageMetadata(html: string): PageMetadata {
  return {
    title: readMetaContent(html, "og:title") ?? readDocumentTitle(html),
    description: readMetaContent(html, "og:description"),
    jsonLdSnippets: readJsonLdSnippets(html),
  };
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

function buildExtractionContext(
  pageUrl: string,
  metadata: PageMetadata,
  pageText: string,
): string {
  const parts = [`URL: ${pageUrl}`];

  if (metadata.title) {
    parts.push(`OpenGraph title: ${metadata.title}`);
  }

  if (metadata.description) {
    parts.push(`OpenGraph description: ${metadata.description}`);
  }

  if (metadata.jsonLdSnippets.length > 0) {
    parts.push(
      `JSON-LD:\n${metadata.jsonLdSnippets.map((snippet) => snippet.slice(0, 2000)).join("\n\n")}`,
    );
  }

  parts.push(`Page text:\n${pageText}`);
  return parts.join("\n\n");
}

function isLinkedInBlockedPage(html: string, status: number): boolean {
  if (status === 403 || status === 999) {
    return true;
  }

  const lower = html.toLowerCase();
  const signals = [
    "authwall",
    "sign in",
    "join linkedin",
    "login",
    "challenge",
    "unusual activity",
  ];

  return signals.some((signal) => lower.includes(signal));
}

function metadataToDetails(metadata: PageMetadata): ExtractedJobDetails {
  const details: ExtractedJobDetails = {};

  if (metadata.title?.trim()) {
    details.title = metadata.title.trim();
  }

  if (metadata.description?.trim()) {
    details.summary = metadata.description.trim();
  }

  return details;
}

function mergeExtractedDetails(
  primary: ExtractedJobDetails,
  fallback: ExtractedJobDetails,
): ExtractedJobDetails {
  return {
    title: primary.title?.trim() || fallback.title,
    company: primary.company?.trim() || fallback.company,
    location: primary.location?.trim() || fallback.location,
    salary: primary.salary?.trim() || fallback.salary,
    description: primary.description?.trim() || fallback.description,
    summary: primary.summary?.trim() || fallback.summary,
    likelySkills:
      primary.likelySkills && primary.likelySkills.length > 0
        ? primary.likelySkills
        : fallback.likelySkills,
    applicationDeadline:
      primary.applicationDeadline?.trim() || fallback.applicationDeadline,
  };
}

function buildLinkedInBlockedResult(url: string): ExtractJobResult {
  const canonicalUrl = canonicalizeLinkedInJobUrl(url) ?? undefined;
  const slugDetails = extractLinkedInSlugDetails(url);
  const slugFields = slugDetails ? linkedInSlugToJobFields(slugDetails) : {};
  const hasSlugContent = Boolean(slugFields.title || slugFields.company);

  return {
    ok: false,
    message: hasSlugContent
      ? LINKEDIN_BLOCKED_SLUG_MESSAGE
      : LINKEDIN_BLOCKED_ID_ONLY_MESSAGE,
    code: "linkedin_blocked",
    canonicalUrl,
    suggestPasteFallback: true,
    details: hasSlugContent ? slugFields : undefined,
  };
}

type FetchPageResult = {
  html: string;
  text: string;
  metadata: PageMetadata;
  status: number;
};

async function fetchPage(url: URL): Promise<FetchPageResult> {
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
    const metadata = extractPageMetadata(html);
    const text = htmlToText(html);

    if (text.length < 80 && !metadata.title && metadata.jsonLdSnippets.length === 0) {
      throw new Error("not enough text");
    }

    return {
      html,
      text,
      metadata,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("fetch timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractDetailsWithAi(
  pageUrl: string,
  pageText: string,
  userId?: string,
  systemPrompt = "Extract structured job posting details from page text. Return a JSON object with optional keys: title, company, location, salary, description, summary, likelySkills (string array), applicationDeadline. Do not invent details that are not supported by the text. Keep description concise but useful. Summary should be 1-2 sentences.",
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
          content: systemPrompt,
        },
        {
          role: "user",
          content: pageText,
        },
      ],
    }),
    AI_TIMEOUT_MS,
  );

  if (userId) {
    void logAiUsage({
      userId,
      feature: AI_USAGE_FEATURES.JOB_URL_EXTRACTION,
      model: response.model ?? DEFAULT_PARSE_MODEL,
      usage: response.usage,
    });
  }

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

async function extractJobFromUrlInternal(
  url: string,
  userId?: string,
): Promise<ExtractJobResult> {
  const parsedUrl = validateFetchUrl(url);
  const canonicalUrl = canonicalizeLinkedInJobUrl(url) ?? undefined;
  const fetchUrl = canonicalUrl ? new URL(canonicalUrl) : parsedUrl;
  const page = await fetchPage(fetchUrl);

  if (isLinkedInJobUrl(fetchUrl) && isLinkedInBlockedPage(page.html, page.status)) {
    return buildLinkedInBlockedResult(url);
  }

  const metadataDetails = metadataToDetails(page.metadata);
  const context = buildExtractionContext(fetchUrl.toString(), page.metadata, page.text);

  let aiDetails: ExtractedJobDetails = {};
  try {
    aiDetails = await extractDetailsWithAi(fetchUrl.toString(), context, userId);
  } catch {
    if (hasExtractedContent(metadataDetails)) {
      return {
        ok: true,
        details: metadataDetails,
        canonicalUrl,
      };
    }

    throw new Error("ai extraction failed");
  }

  const details = mergeExtractedDetails(aiDetails, metadataDetails);

  if (!hasExtractedContent(details)) {
    return {
      ok: false,
      message: JOB_URL_EXTRACT_FAILURE_MESSAGE,
      code: "generic",
      canonicalUrl,
      suggestPasteFallback: Boolean(canonicalUrl),
    };
  }

  return {
    ok: true,
    details,
    canonicalUrl,
  };
}

export async function extractJobFromUrlSafe(
  url: string,
  userId?: string,
): Promise<ExtractJobResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, message: JOB_URL_EXTRACT_FAILURE_MESSAGE };
  }

  const canonicalUrl = canonicalizeLinkedInJobUrl(trimmed) ?? undefined;

  try {
    return await withTimeout(extractJobFromUrlInternal(trimmed, userId), EXTRACT_TIMEOUT_MS);
  } catch {
    if (canonicalUrl) {
      return buildLinkedInBlockedResult(trimmed);
    }

    return {
      ok: false,
      message: JOB_URL_EXTRACT_FAILURE_MESSAGE,
      code: "generic",
    };
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

export { normalizeJobUrlForStorage };
