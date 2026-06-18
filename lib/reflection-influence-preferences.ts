import {
  normalizeReflectionInfluenceIds,
  type ReflectionInfluenceId,
} from "@/lib/reflection-influences";
import { canUseCoachingFeatures, type UserAccess } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function requireCoachingAccess(access: UserAccess): Promise<void> {
  if (!canUseCoachingFeatures(access)) {
    throw new Error("Not authorized.");
  }
}

export async function getReflectionInfluenceIdsForUser(
  userId: string,
  access: UserAccess,
): Promise<ReflectionInfluenceId[]> {
  await requireCoachingAccess(access);

  const preference = await prisma.reflectionInfluencePreference.findUnique({
    where: { userId },
    select: { influences: true },
  });

  return normalizeReflectionInfluenceIds(preference?.influences ?? []);
}

export async function saveReflectionInfluenceIdsForUser(
  userId: string,
  access: UserAccess,
  influences: ReflectionInfluenceId[],
): Promise<ReflectionInfluenceId[]> {
  await requireCoachingAccess(access);

  const normalized = normalizeReflectionInfluenceIds(influences);

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
