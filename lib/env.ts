/**
 * Server-side environment helpers. Do not import in client components.
 */

export type PlanletAiProvider = "openai" | "anthropic";

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAiTtsConfigurationStatus() {
  const flag = process.env.LIFE_LAB_OPENAI_TTS_ENABLED?.trim().toLowerCase() ?? null;
  const hasOpenAIKey = isOpenAIConfigured();

  return {
    hasOpenAIKey,
    ttsEnabledFlag: flag,
    isEnabled: isLifeLabOpenAiTtsEnabled(),
    model: getOpenAiTtsModel(),
    voice: getOpenAiTtsVoice(),
  };
}

export function validateOpenAiTtsConfiguration():
  | { ok: true; model: string; voice: string }
  | { ok: false; reason: "feature_disabled" | "configuration_missing" | "invalid_model_or_voice" } {
  if (!isLifeLabOpenAiTtsEnabled()) {
    const flag = process.env.LIFE_LAB_OPENAI_TTS_ENABLED?.trim().toLowerCase();

    if (flag === "false" || flag === "0") {
      return { ok: false, reason: "feature_disabled" };
    }

    return { ok: false, reason: "configuration_missing" };
  }

  const model = getOpenAiTtsModel();
  const voice = getOpenAiTtsVoice();

  if (!model || !voice) {
    return { ok: false, reason: "invalid_model_or_voice" };
  }

  return { ok: true, model, voice };
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

export function isLifeLabOpenAiTtsEnabled(): boolean {
  const flag = process.env.LIFE_LAB_OPENAI_TTS_ENABLED?.trim().toLowerCase();

  if (flag === "false" || flag === "0") {
    return false;
  }

  return isOpenAIConfigured();
}

export function getOpenAiTtsModel(): string {
  return process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
}

export function getOpenAiTtsVoice(): string {
  return process.env.OPENAI_TTS_VOICE?.trim() || "coral";
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

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");

  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  const cronHeader = request.headers.get("x-cron-secret");

  if (cronHeader === secret) {
    return true;
  }

  const url = new URL(request.url);

  return url.searchParams.get("secret") === secret;
}
