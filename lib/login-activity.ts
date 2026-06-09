import type { UserRole } from "@/app/generated/prisma/client";

import { syncUserRoleOnSignIn } from "@/lib/auth-roles";
import { prisma } from "@/lib/prisma";

type TrackUserSignInInput = {
  userId?: string | null;
  email?: string | null;
  provider?: string | null;
};

async function resolveUserId(
  userId: string | null | undefined,
  normalizedEmail: string,
): Promise<string | null> {
  if (userId) {
    const byId = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (byId) {
      return byId.id;
    }
  }

  const byEmail = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  return byEmail?.id ?? null;
}

export async function trackUserSignIn({
  userId,
  email,
  provider,
}: TrackUserSignInInput): Promise<UserRole | null> {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail) {
    console.warn("[planlet] login tracking skipped: missing email");
    return null;
  }

  const normalizedEmail = trimmedEmail.toLowerCase();
  const resolvedUserId = await resolveUserId(userId, normalizedEmail);

  if (!resolvedUserId) {
    console.warn(
      "[planlet] login tracking skipped: user not found for",
      normalizedEmail,
    );
    return null;
  }

  const role = await syncUserRoleOnSignIn(resolvedUserId, trimmedEmail);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resolvedUserId },
      data: {
        lastLoginAt: now,
        loginCount: { increment: 1 },
      },
    }),
    prisma.loginEvent.create({
      data: {
        userId: resolvedUserId,
        email: normalizedEmail,
        provider: provider ?? "google",
      },
    }),
  ]);

  return role;
}

/** Never throws — tracking failures must not block sign-in. */
export async function trackUserSignInSafely(
  input: TrackUserSignInInput,
): Promise<UserRole | null> {
  try {
    return await trackUserSignIn(input);
  } catch (error) {
    console.warn("[planlet] login tracking failed:", error);
    return null;
  }
}
