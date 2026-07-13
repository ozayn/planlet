import { prisma } from "@/lib/prisma";
import { hashNarrationContent } from "@/lib/life-lab/narration-cache-key";
import { formatOpenAiNarrationVoiceLabel } from "@/lib/life-lab/openai-narration-preferences";
import { isSupportedOpenAiNarrationVoice } from "@/lib/life-lab/narration-config";
import {
  COACHING_DEFAULT_OPENAI_VOICE,
  COACHING_NARRATION_INSTRUCTION_VERSION,
  COACHING_NARRATION_PREVIEW_TEXT,
  COACHING_OPENAI_NARRATION_STYLES,
  DEFAULT_COACHING_NARRATION_PREFERENCES,
  getCoachingContentProfileVersion,
  isCoachingOpenAiNarrationStyle,
  resolveCoachingNarrationInstructions,
  resolveCoachingOpenAiNarrationVoice,
  type CoachingNarrationPreferences,
  type CoachingOpenAiNarrationStyleId,
} from "@/lib/coaching/narration-config";

export type {
  CoachingNarrationPreferences,
  CoachingOpenAiNarrationStyleId,
} from "@/lib/coaching/narration-config";
export {
  DEFAULT_COACHING_NARRATION_PREFERENCES,
  formatCoachingOpenAiNarrationStyleLabel,
} from "@/lib/coaching/narration-config";

export type ResolvedCoachingNarrationSettings = {
  voice: string;
  requestedVoice: string;
  narrationStyle: CoachingOpenAiNarrationStyleId;
  narrationStyleSlug: string;
  instructions: string;
  instructionsFingerprint: string;
  instructionVersion: number;
  contentProfileVersion: number;
  voiceWarning: string | null;
};

export function normalizeCoachingOpenAiNarrationStyle(
  value: string | null | undefined,
): CoachingOpenAiNarrationStyleId {
  if (value && isCoachingOpenAiNarrationStyle(value)) {
    return value;
  }

  return DEFAULT_COACHING_NARRATION_PREFERENCES.openAiNarrationStyle;
}

export function resolveCoachingOpenAiNarrationSettings(
  preferences: CoachingNarrationPreferences,
): ResolvedCoachingNarrationSettings {
  const narrationStyle = normalizeCoachingOpenAiNarrationStyle(
    preferences.openAiNarrationStyle,
  );
  const voiceResolution = resolveCoachingOpenAiNarrationVoice({
    userVoice: preferences.openAiTtsVoice,
  });
  const instructions = resolveCoachingNarrationInstructions(narrationStyle);

  return {
    voice: voiceResolution.voice,
    requestedVoice: voiceResolution.requestedVoice,
    narrationStyle,
    narrationStyleSlug: COACHING_OPENAI_NARRATION_STYLES[narrationStyle].slug,
    instructions,
    instructionsFingerprint: hashNarrationContent(instructions),
    instructionVersion: COACHING_NARRATION_INSTRUCTION_VERSION,
    contentProfileVersion: getCoachingContentProfileVersion(),
    voiceWarning: voiceResolution.voiceWarning,
  };
}

export async function getCoachingNarrationPreferencesForUser(
  userId: string,
): Promise<CoachingNarrationPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coachingOpenAiTtsVoice: true,
      coachingOpenAiNarrationStyle: true,
    },
  });

  if (!user) {
    return DEFAULT_COACHING_NARRATION_PREFERENCES;
  }

  return {
    openAiTtsVoice:
      user.coachingOpenAiTtsVoice?.trim() || COACHING_DEFAULT_OPENAI_VOICE,
    openAiNarrationStyle: normalizeCoachingOpenAiNarrationStyle(
      user.coachingOpenAiNarrationStyle,
    ),
  };
}

export async function getResolvedCoachingNarrationSettingsForUser(
  userId: string,
): Promise<ResolvedCoachingNarrationSettings> {
  const preferences = await getCoachingNarrationPreferencesForUser(userId);
  return resolveCoachingOpenAiNarrationSettings(preferences);
}

export async function updateCoachingOpenAiTtsVoice(
  userId: string,
  voice: string,
): Promise<void> {
  const trimmed = voice.trim();

  if (trimmed && !isSupportedOpenAiNarrationVoice(trimmed)) {
    throw new Error("Unsupported Coaching OpenAI voice.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      coachingOpenAiTtsVoice: trimmed || COACHING_DEFAULT_OPENAI_VOICE,
    },
  });
}

export async function updateCoachingOpenAiNarrationStyle(
  userId: string,
  style: string,
): Promise<void> {
  if (!isCoachingOpenAiNarrationStyle(style)) {
    throw new Error("Unsupported Coaching narration style.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      coachingOpenAiNarrationStyle: style,
    },
  });
}

export function getCoachingNarrationPreviewText(): string {
  return COACHING_NARRATION_PREVIEW_TEXT;
}

export function formatCoachingOpenAiNarrationVoiceLabel(voiceId: string): string {
  return formatOpenAiNarrationVoiceLabel(voiceId);
}
