import {
  getAllSelectedInfluenceIds,
  normalizeReflectionInfluencePreferences,
  type ReflectionInfluenceId,
  type ReflectionInfluencePreferences,
} from "@/lib/reflection-influences";
import { canUseCoachingFeatures, type UserAccess } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function requireCoachingAccess(access: UserAccess): Promise<void> {
  if (!canUseCoachingFeatures(access)) {
    throw new Error("Not authorized.");
  }
}

export async function getReflectionInfluencePreferencesForUser(
  userId: string,
  access: UserAccess,
): Promise<ReflectionInfluencePreferences> {
  await requireCoachingAccess(access);

  const preference = await prisma.reflectionInfluencePreference.findUnique({
    where: { userId },
    select: { influences: true },
  });

  return normalizeReflectionInfluencePreferences(preference?.influences ?? []);
}

/** @deprecated Use getReflectionInfluencePreferencesForUser */
export async function getReflectionInfluenceIdsForUser(
  userId: string,
  access: UserAccess,
): Promise<ReflectionInfluenceId[]> {
  const preferences = await getReflectionInfluencePreferencesForUser(
    userId,
    access,
  );
  return getAllSelectedInfluenceIds(preferences);
}

export async function saveReflectionInfluencePreferencesForUser(
  userId: string,
  access: UserAccess,
  preferences: ReflectionInfluencePreferences,
): Promise<ReflectionInfluencePreferences> {
  await requireCoachingAccess(access);

  const normalized = normalizeReflectionInfluencePreferences(preferences);

  await prisma.reflectionInfluencePreference.upsert({
    where: { userId },
    create: {
      userId,
      influences: normalized,
    },
    update: {
      influences: normalized,
    },
  });

  return normalized;
}

/** @deprecated Use saveReflectionInfluencePreferencesForUser */
export async function saveReflectionInfluenceIdsForUser(
  userId: string,
  access: UserAccess,
  influences: ReflectionInfluenceId[],
): Promise<ReflectionInfluenceId[]> {
  const normalized = await saveReflectionInfluencePreferencesForUser(
    userId,
    access,
    { primary: [], secondary: influences },
  );
  return getAllSelectedInfluenceIds(normalized);
}
