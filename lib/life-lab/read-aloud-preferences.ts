import type { LifeLabReadAloudProvider } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  isLifeLabReadAloudProvider,
  isSupportedOpenAiNarrationVoice,
  LIFE_LAB_READ_ALOUD_PROVIDERS,
  type OpenAiNarrationStyleId,
} from "@/lib/life-lab/narration-config";
import {
  DEFAULT_OPENAI_NARRATION_PREFERENCES,
  normalizeOpenAiNarrationStyle,
  resolveOpenAiNarrationSettings,
  type OpenAiNarrationPreferences,
  type ResolvedOpenAiNarrationSettings,
} from "@/lib/life-lab/openai-narration-preferences";
import {
  DEFAULT_READ_ALOUD_SECTION_INCLUSION,
  normalizeReadAloudSectionInclusion,
  type ReadAloudSectionInclusionPrefs,
} from "@/lib/life-lab/read-aloud-sections";
import {
  DEFAULT_SPEECH_RATE,
  SPEECH_AUTO_VOICE_ID,
  type SpeechRate,
} from "@/lib/life-lab/speech";

export type { ReadAloudSectionInclusionPrefs } from "@/lib/life-lab/read-aloud-sections";
export { DEFAULT_READ_ALOUD_SECTION_INCLUSION } from "@/lib/life-lab/read-aloud-sections";

export type LifeLabReadAloudPreferences = {
  provider: LifeLabReadAloudProvider;
  speechVoiceId: string;
  speechRate: SpeechRate;
  openAiTtsVoice: string;
  /** True when the user has an explicitly saved OpenAI voice (not env fallback). */
  hasExplicitOpenAiVoice: boolean;
  openAiNarrationStyle: OpenAiNarrationStyleId;
  customNarrationInstructions: string | null;
  readAloudAutoContinue: boolean;
  readAloudSectionInclusion: ReadAloudSectionInclusionPrefs;
};

const DEFAULT_PREFERENCES: LifeLabReadAloudPreferences = {
  provider: LIFE_LAB_READ_ALOUD_PROVIDERS.DEVICE,
  speechVoiceId: SPEECH_AUTO_VOICE_ID,
  speechRate: DEFAULT_SPEECH_RATE,
  openAiTtsVoice: DEFAULT_OPENAI_NARRATION_PREFERENCES.voice,
  hasExplicitOpenAiVoice: false,
  openAiNarrationStyle: DEFAULT_OPENAI_NARRATION_PREFERENCES.narrationStyle,
  customNarrationInstructions: null,
  readAloudAutoContinue: true,
  readAloudSectionInclusion: DEFAULT_READ_ALOUD_SECTION_INCLUSION,
};

function normalizeSpeechRate(value: number | null | undefined): SpeechRate {
  const allowed = [0.8, 1, 1.15, 1.3, 1.5] as const;

  if (value == null) {
    return DEFAULT_SPEECH_RATE;
  }

  const closest = allowed.reduce((best, current) =>
    Math.abs(current - value) < Math.abs(best - value) ? current : best,
  );

  return closest;
}

function mapUserToOpenAiPreferences(user: {
  lifeLabOpenAiTtsVoice: string | null;
  lifeLabOpenAiNarrationStyle: string;
  lifeLabCustomNarrationInstructions: string | null;
}): OpenAiNarrationPreferences {
  return {
    voice: user.lifeLabOpenAiTtsVoice?.trim() || DEFAULT_OPENAI_NARRATION_PREFERENCES.voice,
    narrationStyle: normalizeOpenAiNarrationStyle(user.lifeLabOpenAiNarrationStyle),
    customNarrationInstructions: user.lifeLabCustomNarrationInstructions?.trim() || null,
  };
}

export async function getLifeLabReadAloudPreferencesForUser(
  userId: string,
): Promise<LifeLabReadAloudPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lifeLabReadAloudProvider: true,
      lifeLabSpeechVoiceId: true,
      lifeLabSpeechRate: true,
      lifeLabOpenAiTtsVoice: true,
      lifeLabOpenAiNarrationStyle: true,
      lifeLabCustomNarrationInstructions: true,
      lifeLabReadAloudAutoContinue: true,
      lifeLabReadAloudSectionInclusion: true,
    },
  });

  if (!user) {
    return DEFAULT_PREFERENCES;
  }

  const provider = isLifeLabReadAloudProvider(user.lifeLabReadAloudProvider)
    ? user.lifeLabReadAloudProvider
    : DEFAULT_PREFERENCES.provider;
  const openAi = mapUserToOpenAiPreferences(user);
  const explicitVoice = user.lifeLabOpenAiTtsVoice?.trim() || "";

  return {
    provider,
    speechVoiceId: user.lifeLabSpeechVoiceId?.trim() || SPEECH_AUTO_VOICE_ID,
    speechRate: normalizeSpeechRate(user.lifeLabSpeechRate),
    openAiTtsVoice: openAi.voice,
    hasExplicitOpenAiVoice: Boolean(explicitVoice),
    openAiNarrationStyle: openAi.narrationStyle,
    customNarrationInstructions: openAi.customNarrationInstructions,
    readAloudAutoContinue: user.lifeLabReadAloudAutoContinue,
    readAloudSectionInclusion: normalizeReadAloudSectionInclusion(
      user.lifeLabReadAloudSectionInclusion,
    ),
  };
}

export async function getResolvedOpenAiNarrationSettingsForUser(
  userId: string,
): Promise<ResolvedOpenAiNarrationSettings> {
  const preferences = await getLifeLabReadAloudPreferencesForUser(userId);

  return resolveOpenAiNarrationSettings({
    voice: preferences.openAiTtsVoice,
    narrationStyle: preferences.openAiNarrationStyle,
    customNarrationInstructions: preferences.customNarrationInstructions,
  });
}

export async function updateLifeLabReadAloudProvider(
  userId: string,
  provider: LifeLabReadAloudProvider,
): Promise<void> {
  if (!isLifeLabReadAloudProvider(provider)) {
    throw new Error("Invalid read aloud provider.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lifeLabReadAloudProvider: provider },
  });
}

export async function updateLifeLabSpeechVoiceId(
  userId: string,
  speechVoiceId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lifeLabSpeechVoiceId: speechVoiceId.trim() || null,
    },
  });
}

export async function updateLifeLabSpeechRate(
  userId: string,
  speechRate: SpeechRate,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lifeLabSpeechRate: speechRate },
  });
}

export async function updateLifeLabOpenAiTtsVoice(
  userId: string,
  voice: string,
): Promise<void> {
  const trimmed = voice.trim();

  if (!trimmed || !isSupportedOpenAiNarrationVoice(trimmed)) {
    throw new Error("Unsupported OpenAI narration voice.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lifeLabOpenAiTtsVoice: trimmed,
    },
  });
}

export async function updateLifeLabOpenAiNarrationStyle(
  userId: string,
  style: OpenAiNarrationStyleId,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lifeLabOpenAiNarrationStyle: style,
    },
  });
}

export async function updateLifeLabCustomNarrationInstructions(
  userId: string,
  instructions: string | null,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lifeLabCustomNarrationInstructions: instructions?.trim() || null,
    },
  });
}

export async function updateLifeLabReadAloudAutoContinue(
  userId: string,
  autoContinue: boolean,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lifeLabReadAloudAutoContinue: autoContinue,
    },
  });
}

export async function updateLifeLabReadAloudSectionInclusion(
  userId: string,
  inclusion: ReadAloudSectionInclusionPrefs,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lifeLabReadAloudSectionInclusion: inclusion,
    },
  });
}
