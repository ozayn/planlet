import {
  buildNarrationPlaybackChunks,
} from "@/lib/life-lab/narration-chunks";
import {
  buildNarrationDocument,
} from "@/lib/life-lab/narration-text";

const FLASHCARD_SECTION_PATTERN =
  /^#{1,6}\s+(?:Optional Flashcards|Flashcards|Study Cards)\s*[\r\n]+[\s\S]*$/gim;

type VoicePreferenceRule = {
  langPrefix: string;
  nameIncludes: string;
};

// Prefer natural macOS Safari system voices. Daniel is intentionally deprioritized.
const VOICE_PREFERENCE_RULES: VoicePreferenceRule[] = [
  { langPrefix: "en-gb", nameIncludes: "flo" },
  { langPrefix: "en-gb", nameIncludes: "serena" },
  { langPrefix: "en-gb", nameIncludes: "kate" },
  { langPrefix: "en-gb", nameIncludes: "moira" },
  { langPrefix: "en-gb", nameIncludes: "samantha" },
  { langPrefix: "en-us", nameIncludes: "samantha" },
  { langPrefix: "en-au", nameIncludes: "karen" },
  { langPrefix: "en-gb", nameIncludes: "eddy" },
];

const ROBOTIC_VOICE_NAMES = ["daniel"] as const;

const NOVELTY_VOICE_NAMES = [
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "good news",
  "grandma",
  "grandpa",
  "junior",
  "ralph",
  "reed",
  "rocko",
  "sandy",
  "shelley",
  "superstar",
  "trinoids",
  "wobble",
  "zarvox",
] as const;

// Browser note: Chrome on macOS may expose speechSynthesis voices but fail to start audio;
// Safari is more reliable for native speech.
export const DEFAULT_SPEECH_LANG = "en-GB";

export const SPEECH_CHUNK_MAX_LENGTH = 1000;

export const SPEECH_RATE_OPTIONS = [0.8, 1, 1.15, 1.3, 1.5] as const;

export const DEFAULT_SPEECH_RATE: SpeechRate = 1;

export const SPEECH_START_TIMEOUT_MS = 2500;

export const SPEECH_AUTO_VOICE_ID = "auto";

export const SPEECH_VOICE_STORAGE_KEY = "planlet-life-lab-speech-voice";

export const SPEECH_BROWSER_FALLBACK_MESSAGE =
  "Read aloud may not work in this browser. Try Safari on macOS, or another browser.";

export const SPEECH_VOICE_SELECTION_FALLBACK_MESSAGE =
  "That voice didn't work here. Switched back to Auto.";

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

export function getSpeechVoiceId(voice: SpeechSynthesisVoice): string {
  return voice.voiceURI || `${voice.name}:${voice.lang}`;
}

export type SelectableSpeechVoiceOption = {
  id: string;
  label: string;
  matches: (voice: SpeechSynthesisVoice) => boolean;
};

export const SELECTABLE_SPEECH_VOICE_OPTIONS: readonly SelectableSpeechVoiceOption[] =
  [
    {
      id: "google-uk-english-female",
      label: "Google UK English Female (en-gb)",
      matches: (voice) =>
        normalizeSpeechLang(voice.lang).startsWith("en-gb") &&
        matchesGoogleUkEnglishFemaleName(voice.name),
    },
    {
      id: "google-uk-english-male",
      label: "Google UK English Male (en-gb)",
      matches: (voice) =>
        normalizeSpeechLang(voice.lang).startsWith("en-gb") &&
        matchesGoogleUkEnglishMaleName(voice.name),
    },
    {
      id: "google-us-english",
      label: "Google US English (en-us)",
      matches: (voice) =>
        normalizeSpeechLang(voice.lang).startsWith("en-us") &&
        matchesGoogleUsEnglishName(voice.name),
    },
  ] as const;

function normalizeSpeechVoiceName(name: string): string {
  return name.trim().toLowerCase();
}

function matchesGoogleUkEnglishFemaleName(name: string): boolean {
  const normalized = normalizeSpeechVoiceName(name);

  return (
    normalized === "google uk english female" ||
    (normalized.includes("google") &&
      normalized.includes("uk") &&
      normalized.includes("female"))
  );
}

function matchesGoogleUkEnglishMaleName(name: string): boolean {
  const normalized = normalizeSpeechVoiceName(name);

  if (normalized.includes("female")) {
    return false;
  }

  return (
    normalized === "google uk english male" ||
    (normalized.includes("google") &&
      normalized.includes("uk") &&
      normalized.includes("male"))
  );
}

function matchesGoogleUsEnglishName(name: string): boolean {
  const normalized = normalizeSpeechVoiceName(name);

  return (
    normalized === "google us english" ||
    (normalized.includes("google") &&
      normalized.includes("us") &&
      normalized.includes("english") &&
      !normalized.includes("uk"))
  );
}

export type ListedSelectableSpeechVoice = {
  id: string;
  label: string;
  voice: SpeechSynthesisVoice;
};

export function listAllDeviceSpeechVoices(
  voices: SpeechSynthesisVoice[],
): ListedSelectableSpeechVoice[] {
  return sortVoicesForDropdown(
    voices.filter((voice) => !isNoveltySpeechVoice(voice)),
  ).map((voice) => toListedSelectableSpeechVoice(voice));
}

export function listSelectableSpeechVoices(
  voices: SpeechSynthesisVoice[],
): ListedSelectableSpeechVoice[] {
  const googleVoices: ListedSelectableSpeechVoice[] = [];

  for (const option of SELECTABLE_SPEECH_VOICE_OPTIONS) {
    const voice = voices.find(option.matches);

    if (voice) {
      googleVoices.push({
        id: option.id,
        label: option.label,
        voice,
      });
    }
  }

  if (googleVoices.length > 0) {
    return googleVoices;
  }

  const englishVoices = sortVoicesForDropdown(
    voices.filter(
      (voice) => isEnglishSpeechVoice(voice) && !isNoveltySpeechVoice(voice),
    ),
  );

  if (englishVoices.length > 0) {
    return englishVoices.map((voice) => toListedSelectableSpeechVoice(voice));
  }

  return [];
}

export function findSelectableSpeechVoiceById(
  voices: SpeechSynthesisVoice[],
  voiceId: string,
): SpeechSynthesisVoice | null {
  const googleOption = SELECTABLE_SPEECH_VOICE_OPTIONS.find(
    (entry) => entry.id === voiceId,
  );

  if (googleOption) {
    const voice = voices.find(googleOption.matches);
    return voice && !isNoveltySpeechVoice(voice) ? voice : null;
  }

  const voice = findSpeechVoiceById(voices, voiceId);

  if (!voice || isNoveltySpeechVoice(voice)) {
    return null;
  }

  return voice;
}

export function isEnglishSpeechVoice(voice: SpeechSynthesisVoice): boolean {
  return voice.lang.toLowerCase().startsWith("en");
}

function normalizeSpeechLang(lang: string): string {
  return lang.toLowerCase().replace("_", "-");
}

function isNoveltySpeechVoice(voice: SpeechSynthesisVoice): boolean {
  const normalized = normalizeSpeechVoiceName(voice.name);
  const primaryName = normalized.split(/[\s(]/)[0] ?? normalized;

  return NOVELTY_VOICE_NAMES.some(
    (name) =>
      normalized === name ||
      primaryName === name ||
      normalized.startsWith(`${name} `) ||
      normalized.endsWith(` ${name}`),
  );
}

function sortVoicesForDropdown(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
  return [...voices].sort((left, right) => {
    const leftGb = normalizeSpeechLang(left.lang).startsWith("en-gb") ? 0 : 1;
    const rightGb = normalizeSpeechLang(right.lang).startsWith("en-gb") ? 0 : 1;

    if (leftGb !== rightGb) {
      return leftGb - rightGb;
    }

    return left.name.localeCompare(right.name);
  });
}

function toListedSelectableSpeechVoice(
  voice: SpeechSynthesisVoice,
): ListedSelectableSpeechVoice {
  return {
    id: getSpeechVoiceId(voice),
    label: `${voice.name} (${normalizeSpeechLang(voice.lang)})`,
    voice,
  };
}

function voiceNameIncludes(voice: SpeechSynthesisVoice, fragment: string): boolean {
  return voice.name.toLowerCase().includes(fragment);
}

function isRoboticSpeechVoice(voice: SpeechSynthesisVoice): boolean {
  return ROBOTIC_VOICE_NAMES.some((name) => voiceNameIncludes(voice, name));
}

function matchesVoicePreferenceRule(
  voice: SpeechSynthesisVoice,
  rule: VoicePreferenceRule,
): boolean {
  const lang = normalizeSpeechLang(voice.lang);

  if (!lang.startsWith(rule.langPrefix)) {
    return false;
  }

  return voiceNameIncludes(voice, rule.nameIncludes);
}

function pickFirstMatchingVoice(
  voices: SpeechSynthesisVoice[],
  predicate: (voice: SpeechSynthesisVoice) => boolean,
): SpeechSynthesisVoice | null {
  return voices.find(predicate) ?? null;
}

export function listEnglishSpeechVoices(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
  return listSelectableSpeechVoices(voices).map((entry) => entry.voice);
}

export function formatSpeechVoiceLabel(voice: SpeechSynthesisVoice): string {
  for (const option of SELECTABLE_SPEECH_VOICE_OPTIONS) {
    if (option.matches(voice)) {
      return option.label;
    }
  }

  return `${voice.name} (${normalizeSpeechLang(voice.lang)})`;
}

export function findSpeechVoiceById(
  voices: SpeechSynthesisVoice[],
  voiceId: string,
): SpeechSynthesisVoice | null {
  return (
    voices.find((voice) => getSpeechVoiceId(voice) === voiceId) ?? null
  );
}

export function readStoredSpeechVoiceId(): string {
  if (typeof window === "undefined") {
    return SPEECH_AUTO_VOICE_ID;
  }

  try {
    return (
      window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY) ??
      SPEECH_AUTO_VOICE_ID
    );
  } catch {
    return SPEECH_AUTO_VOICE_ID;
  }
}

export function writeStoredSpeechVoiceId(voiceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SPEECH_VOICE_STORAGE_KEY, voiceId);
  } catch {
    // Ignore storage failures and keep the in-memory selection.
  }
}

export function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null;
  }

  for (const option of SELECTABLE_SPEECH_VOICE_OPTIONS) {
    const match = voices.find(option.matches);

    if (match) {
      return match;
    }
  }

  for (const rule of VOICE_PREFERENCE_RULES) {
    const match = pickFirstMatchingVoice(voices, (voice) =>
      matchesVoicePreferenceRule(voice, rule) && !isNoveltySpeechVoice(voice),
    );

    if (match) {
      return match;
    }
  }

  const enGbVoices = voices.filter(
    (voice) =>
      normalizeSpeechLang(voice.lang).startsWith("en-gb") &&
      !isNoveltySpeechVoice(voice),
  );
  const naturalEnGbVoice = pickFirstMatchingVoice(
    enGbVoices,
    (voice) => !isRoboticSpeechVoice(voice),
  );

  if (naturalEnGbVoice) {
    return naturalEnGbVoice;
  }

  if (enGbVoices.length > 0) {
    return enGbVoices[0];
  }

  const englishVoices = voices.filter(
    (voice) => isEnglishSpeechVoice(voice) && !isNoveltySpeechVoice(voice),
  );
  const naturalEnglishVoice = pickFirstMatchingVoice(
    englishVoices,
    (voice) => !isRoboticSpeechVoice(voice),
  );

  if (naturalEnglishVoice) {
    return naturalEnglishVoice;
  }

  if (englishVoices.length > 0) {
    return englishVoices[0];
  }

  return null;
}

export function resolveSpeechVoice(
  voices: SpeechSynthesisVoice[],
  selectedVoiceId: string,
): SpeechSynthesisVoice | null {
  if (selectedVoiceId === SPEECH_AUTO_VOICE_ID) {
    return pickSpeechVoice(voices);
  }

  return findSelectableSpeechVoiceById(voices, selectedVoiceId);
}

const BARE_HTTPS_URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;
const BARE_WWW_URL_PATTERN = /\bwww\.[^\s<>"')\]]+/gi;
const ANGLE_BRACKET_URL_PATTERN = /<https?:\/\/[^>]+>/gi;
const MARKDOWN_LINK_PATTERN = /!?\[([^\]]*)]\([^)]*\)/g;

export function stripBareUrlsFromSpeechText(text: string): string {
  return text
    .replace(BARE_HTTPS_URL_PATTERN, "")
    .replace(BARE_WWW_URL_PATTERN, "");
}

export function isUrlOnlySpeechLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  return /^(https?:\/\/\S+|www\.\S+)$/i.test(trimmed);
}

function cleanupSpeechSpacing(text: string): string {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeSpeechLine(line: string): string {
  let cleaned = stripBareUrlsFromSpeechText(line.replace(ANGLE_BRACKET_URL_PATTERN, " "));

  if (/^source\s*:/i.test(cleaned.trim())) {
    const remainder = cleaned.replace(/^source\s*:\s*/i, "").trim();
    return remainder ? cleaned : "";
  }

  return cleaned;
}

export function sanitizeSpeechText(text: string): string {
  const cleaned = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isUrlOnlySpeechLine(line))
    .map((line) => sanitizeSpeechLine(line))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return cleanupSpeechSpacing(cleaned.join(" "));
}

export function plainTextToSpeechText(text: string): string {
  let cleaned = text.trim();

  if (!cleaned) {
    return "";
  }

  cleaned = cleaned.replace(MARKDOWN_LINK_PATTERN, "$1");
  cleaned = cleaned.replace(ANGLE_BRACKET_URL_PATTERN, " ");

  return sanitizeSpeechText(cleaned);
}

export function markdownToSpeechText(content: string): string {
  let text = content;

  text = text.replace(/```mermaid[\s\S]*?```/gi, " ");
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(FLASHCARD_SECTION_PATTERN, " ");
  text = text.replace(MARKDOWN_LINK_PATTERN, "$1");
  text = text.replace(ANGLE_BRACKET_URL_PATTERN, " ");
  text = text
    .split(/\r?\n/)
    .filter((line) => !isUrlOnlySpeechLine(line))
    .map((line) => sanitizeSpeechLine(line))
    .join("\n");
  text = text.replace(/^#{1,6}\s+(.+?)\s*#*\s*$/gm, "$1. ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/[#>*_~|]/g, " ");
  text = sanitizeSpeechText(text);

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
  options: { includeFlashcards?: boolean } = {},
): string[] {
  const sections = buildNarrationDocument({
    title,
    content,
    includeFlashcards: options.includeFlashcards ?? false,
  });

  return buildNarrationPlaybackChunks(sections).map((chunk) => chunk.text);
}

export function prepareFlashcardSpeechText(parts: {
  question: string;
  answer?: string;
  revealed?: boolean;
}): string[] {
  const segments: string[] = [];
  const question = plainTextToSpeechText(parts.question);

  if (question) {
    segments.push(question);
  }

  if (parts.revealed && parts.answer) {
    const answer = plainTextToSpeechText(parts.answer);

    if (answer) {
      segments.push(answer);
    }
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
  utterance.rate = options.rate ?? DEFAULT_SPEECH_RATE;
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
