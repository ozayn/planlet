import type { LifeLabReadAloudProvider } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  isLifeLabReadAloudProvider,
  LIFE_LAB_READ_ALOUD_PROVIDERS,
} from "@/lib/life-lab/narration-config";
import {
  DEFAULT_SPEECH_RATE,
  SPEECH_AUTO_VOICE_ID,
  type SpeechRate,
} from "@/lib/life-lab/speech";

export type LifeLabReadAloudPreferences = {
  provider: LifeLabReadAloudProvider;
  speechVoiceId: string;
  speechRate: SpeechRate;
};

const DEFAULT_PREFERENCES: LifeLabReadAloudPreferences = {
  provider: LIFE_LAB_READ_ALOUD_PROVIDERS.DEVICE,
  speechVoiceId: SPEECH_AUTO_VOICE_ID,
  speechRate: DEFAULT_SPEECH_RATE,
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

export async function getLifeLabReadAloudPreferencesForUser(
  userId: string,
): Promise<LifeLabReadAloudPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lifeLabReadAloudProvider: true,
      lifeLabSpeechVoiceId: true,
      lifeLabSpeechRate: true,
    },
  });

  if (!user) {
    return DEFAULT_PREFERENCES;
  }

  const provider = isLifeLabReadAloudProvider(user.lifeLabReadAloudProvider)
    ? user.lifeLabReadAloudProvider
    : DEFAULT_PREFERENCES.provider;

  return {
    provider,
    speechVoiceId: user.lifeLabSpeechVoiceId?.trim() || SPEECH_AUTO_VOICE_ID,
    speechRate: normalizeSpeechRate(user.lifeLabSpeechRate),
  };
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
