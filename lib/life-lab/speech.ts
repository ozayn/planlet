const FLASHCARD_SECTION_PATTERN =
  /^#{1,6}\s+(?:Optional Flashcards|Flashcards|Study Cards)\s*[\r\n]+[\s\S]*$/gim;

const PREFERRED_EN_GB_FEMALE_NAMES = ["kate", "serena", "samantha"] as const;
const PREFERRED_EN_GB_MALE_FALLBACK = "daniel";

// Browser note: macOS Safari speechSynthesis tends to work reliably with system voices.
// Chrome on macOS may expose voices yet fail to produce audible speech for some utterances.
export const DEFAULT_SPEECH_LANG = "en-GB";

export const SPEECH_CHUNK_MAX_LENGTH = 1000;

export const SPEECH_RATE_OPTIONS = [0.8, 1, 1.2] as const;

export const SPEECH_START_TIMEOUT_MS = 2500;

export const SPEECH_BROWSER_FALLBACK_MESSAGE =
  "Read aloud may not work in this browser. Try Safari on macOS, or another browser.";

export type SpeechRate = (typeof SPEECH_RATE_OPTIONS)[number];

export type SpeechCancelReason = "stop" | "replace" | "unmount" | null;

export type SpeechDiagnostics = {
  browserName: string;
  isSupported: boolean;
  voiceCount: number;
  lastError: string | null;
};

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function detectSpeechBrowserNameFromUserAgent(userAgent: string): string {
  if (/Edg\//.test(userAgent)) {
    return "Edge";
  }

  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) {
    return "Chrome";
  }

  if (/Firefox\//.test(userAgent)) {
    return "Firefox";
  }

  if (/Safari\//.test(userAgent)) {
    return "Safari";
  }

  return "unknown";
}

export function detectSpeechBrowserName(): string {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  return detectSpeechBrowserNameFromUserAgent(navigator.userAgent);
}

export function getSpeechVoiceCount(): number {
  if (!isSpeechSynthesisSupported()) {
    return 0;
  }

  return window.speechSynthesis.getVoices().length;
}

export function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null;
  }

  const enGbVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("en-gb"),
  );

  for (const preferredName of PREFERRED_EN_GB_FEMALE_NAMES) {
    const match = enGbVoices.find((voice) =>
      voice.name.toLowerCase().includes(preferredName),
    );

    if (match) {
      return match;
    }
  }

  const daniel = enGbVoices.find((voice) =>
    voice.name.toLowerCase().includes(PREFERRED_EN_GB_MALE_FALLBACK),
  );

  if (daniel) {
    return daniel;
  }

  if (enGbVoices.length > 0) {
    return enGbVoices[0];
  }

  const englishVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("en"),
  );

  if (englishVoices.length > 0) {
    return englishVoices[0];
  }

  return voices[0] ?? null;
}

export function markdownToSpeechText(content: string): string {
  let text = content;

  text = text.replace(/```mermaid[\s\S]*?```/gi, " ");
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(FLASHCARD_SECTION_PATTERN, " ");
  text = text.replace(/!\[([^\]]*)]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");
  text = text.replace(/^#{1,6}\s+(.+?)\s*#*\s*$/gm, "$1. ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/[#>*_~|]/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

export function prepareNoteSpeechText(title: string, content: string): string {
  const body = markdownToSpeechText(content);

  if (!body) {
    return title.trim();
  }

  return `${title.trim()}. ${body}`;
}

export function chunkSpeechText(
  text: string,
  maxLength = SPEECH_CHUNK_MAX_LENGTH,
): string[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.length <= maxLength) {
    return [trimmed];
  }

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf(". ", maxLength);

    if (splitAt < maxLength * 0.5) {
      splitAt = remaining.lastIndexOf(" ", maxLength);
    }

    if (splitAt > 0 && remaining.slice(splitAt, splitAt + 2) === ". " && splitAt + 1 <= maxLength) {
      const chunk = remaining.slice(0, splitAt + 1).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      remaining = remaining.slice(splitAt + 2).trim();
      continue;
    }

    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf(" ", maxLength);
    }

    if (splitAt <= 0) {
      splitAt = maxLength;
    }

    const chunk = remaining.slice(0, splitAt).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

export function prepareNoteSpeechChunks(
  title: string,
  content: string,
): string[] {
  return chunkSpeechText(prepareNoteSpeechText(title, content));
}

export function prepareFlashcardSpeechText(parts: {
  question: string;
  answer?: string;
  revealed?: boolean;
}): string[] {
  const segments: string[] = [];
  const question = parts.question.trim();

  if (question) {
    segments.push(question);
  }

  if (parts.revealed && parts.answer?.trim()) {
    segments.push(parts.answer.trim());
  }

  return segments;
}

export function formatSpeechRate(rate: SpeechRate): string {
  return `${rate}x`;
}

export type SpeechUtteranceOptions = {
  rate?: number;
  lang?: string;
  voice?: SpeechSynthesisVoice | null;
};

export function createSpeechUtterance(
  text: string,
  options: SpeechUtteranceOptions = {},
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang ?? DEFAULT_SPEECH_LANG;
  utterance.rate = options.rate ?? 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (options.voice) {
    utterance.voice = options.voice;
  }

  return utterance;
}

export function primeSpeechSynthesis(): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }

  window.speechSynthesis.getVoices();
}

export function logSpeechSynthesisError(
  event: SpeechSynthesisErrorEvent,
  text: string,
  voice: SpeechSynthesisVoice | null,
  cancelReason: SpeechCancelReason,
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (event.error === "canceled" && cancelReason) {
    console.info("[life-lab speech] canceled intentionally", {
      reason: cancelReason,
      textLength: text.length,
    });
    return;
  }

  if (event.error === "canceled") {
    console.warn("[life-lab speech] unexpected cancellation", {
      textLength: text.length,
      voice: voice
        ? {
            name: voice.name,
            lang: voice.lang,
          }
        : null,
    });
    return;
  }

  console.error("[life-lab speech]", {
    error: event.error,
    voice: voice
      ? {
          name: voice.name,
          lang: voice.lang,
        }
      : null,
    textLength: text.length,
    cancelReason,
  });
}
