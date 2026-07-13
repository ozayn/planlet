export type NarrationErrorCategory =
  | "configuration_missing"
  | "feature_disabled"
  | "empty_narration_text"
  | "authentication_failed"
  | "insufficient_quota"
  | "rate_limited"
  | "invalid_model_or_voice"
  | "request_too_large"
  | "cache_failure"
  | "audio_playback_failure"
  | "playback_requires_user_gesture"
  | "unsupported_audio_format"
  | "unsupported_audio_source"
  | "unsafe_audio_url"
  | "blocked_blob_url"
  | "malformed_audio_url"
  | "expired_cached_audio_url"
  | "audio_csp_blocked"
  | "empty_audio_source"
  | "playback_aborted"
  | "audio_network_failure"
  | "audio_decode_failure"
  | "empty_audio_response"
  | "unknown";

export type NarrationErrorPayload = {
  error: string;
  category: NarrationErrorCategory;
  debugMessage?: string;
};

const USER_MESSAGES: Record<NarrationErrorCategory, string> = {
  configuration_missing: "OpenAI narration has not been configured.",
  feature_disabled: "OpenAI narration is disabled on this server.",
  empty_narration_text: "This note has no readable narration text.",
  authentication_failed:
    "OpenAI narration could not authenticate with the API.",
  insufficient_quota:
    "OpenAI narration is temporarily unavailable because the API account has no available quota.",
  rate_limited: "Narration is temporarily rate-limited. Try again shortly.",
  invalid_model_or_voice:
    "OpenAI narration is misconfigured. Check the TTS model and voice.",
  request_too_large: "This narration section is too long to generate at once.",
  cache_failure:
    "Narration was generated but could not be cached. Replay may regenerate it.",
  audio_playback_failure: "Narration audio could not be played in this browser.",
  playback_requires_user_gesture: "Audio is ready. Tap Play to begin.",
  unsupported_audio_format: "This browser does not support the narration audio format.",
  unsupported_audio_source: "This browser could not load the narration audio source.",
  unsafe_audio_url: "This narration audio URL is not allowed.",
  blocked_blob_url: "This browser blocked the narration blob URL.",
  malformed_audio_url: "The narration audio URL was malformed.",
  expired_cached_audio_url: "Cached narration audio is no longer available.",
  audio_csp_blocked:
    "Narration playback was blocked by the browser content security policy.",
  empty_audio_source: "Narration audio source was missing.",
  playback_aborted: "Narration playback was interrupted.",
  audio_network_failure: "Narration audio could not be loaded over the network.",
  audio_decode_failure: "Narration audio could not be decoded in this browser.",
  empty_audio_response: "Narration audio was empty.",
  unknown: "OpenAI narration is unavailable.",
};

export function getNarrationUserMessage(
  category: NarrationErrorCategory,
): string {
  return USER_MESSAGES[category];
}

export function buildNarrationErrorPayload(input: {
  category: NarrationErrorCategory;
  debugMessage?: string;
  includeDebug?: boolean;
}): NarrationErrorPayload {
  return {
    error: getNarrationUserMessage(input.category),
    category: input.category,
    debugMessage:
      input.includeDebug && input.debugMessage
        ? input.debugMessage
        : undefined,
  };
}

function readErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

function readErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error != null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return null;
}

export function categorizeOpenAiError(error: unknown): NarrationErrorCategory {
  const message = readErrorText(error).toLowerCase();
  const status = readErrorStatus(error);

  if (
    message.includes("openai_api_key is not configured") ||
    message.includes("api key is not configured") ||
    message.includes("missing openai")
  ) {
    return "configuration_missing";
  }

  if (message.includes("disabled") || message.includes("feature_disabled")) {
    return "feature_disabled";
  }

  if (message.includes("empty") && message.includes("narration")) {
    return "empty_narration_text";
  }

  if (
    status === 401 ||
    message.includes("incorrect api key") ||
    message.includes("invalid api key") ||
    message.includes("authentication") ||
    message.includes("unauthorized")
  ) {
    return "authentication_failed";
  }

  if (
    status === 402 ||
    message.includes("insufficient_quota") ||
    message.includes("insufficient quota") ||
    message.includes("billing") ||
    message.includes("exceeded your current quota")
  ) {
    return "insufficient_quota";
  }

  if (
    status === 429 ||
    message.includes("rate limit") ||
    message.includes("rate_limit")
  ) {
    return "rate_limited";
  }

  if (
    message.includes("invalid model") ||
    message.includes("invalid voice") ||
    message.includes("model_not_found") ||
    message.includes("voice_not_found")
  ) {
    return "invalid_model_or_voice";
  }

  if (
    status === 413 ||
    message.includes("too large") ||
    message.includes("maximum length") ||
    message.includes("context length")
  ) {
    return "request_too_large";
  }

  if (message.includes("cache")) {
    return "cache_failure";
  }

  return "unknown";
}

export function narrationErrorHttpStatus(
  category: NarrationErrorCategory,
): number {
  switch (category) {
    case "configuration_missing":
    case "feature_disabled":
      return 503;
    case "empty_narration_text":
    case "request_too_large":
      return 400;
    case "authentication_failed":
      return 502;
    case "insufficient_quota":
    case "rate_limited":
      return 503;
    case "invalid_model_or_voice":
      return 502;
    case "cache_failure":
      return 200;
    case "playback_requires_user_gesture":
      return 200;
    case "empty_audio_response":
    case "audio_playback_failure":
    case "unsupported_audio_format":
    case "unsupported_audio_source":
    case "unsafe_audio_url":
    case "blocked_blob_url":
    case "malformed_audio_url":
    case "expired_cached_audio_url":
    case "audio_csp_blocked":
    case "empty_audio_source":
    case "playback_aborted":
    case "audio_network_failure":
    case "audio_decode_failure":
      return 500;
    default:
      return 500;
  }
}
