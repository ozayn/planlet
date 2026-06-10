/**
 * Server-side environment helpers. Do not import in client components.
 */

export type PlanletAiProvider = "openai" | "anthropic";

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function getOpenAITranscribeModel(): string {
  return process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe";
}

export function getOpenAIVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
}

export function isImageExtractionConfigured(): boolean {
  return isOpenAIConfigured();
}

export function getPlanletAiProvider(): PlanletAiProvider {
  const raw = process.env.PLANLET_AI_PROVIDER?.trim().toLowerCase();

  if (raw === "anthropic" || raw === "claude") {
    return "anthropic";
  }

  return "openai";
}

export function getAnthropicApiKey(): string | undefined {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  return apiKey || undefined;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";
}

export function isTextParserConfigured(): boolean {
  if (getPlanletAiProvider() === "anthropic") {
    return isAnthropicConfigured();
  }

  return isOpenAIConfigured();
}

export function getTextParserProviderLabel(): string {
  return getPlanletAiProvider() === "anthropic" ? "Claude" : "OpenAI";
}

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.WEB_PUSH_PUBLIC_KEY?.trim() &&
      process.env.WEB_PUSH_PRIVATE_KEY?.trim() &&
      process.env.WEB_PUSH_SUBJECT?.trim(),
  );
}

export function getWebPushPublicKey(): string | undefined {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  return publicKey || undefined;
}
