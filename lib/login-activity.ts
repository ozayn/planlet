import type { UserRole } from "@/app/generated/prisma/client";

import { isAdminEmail } from "@/lib/auth-allowlist";
import { prisma } from "@/lib/prisma";

const RECENT_LOGIN_WINDOW_MS = 30_000;

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

function resolveSignInRole(
  email: string,
  currentRole: UserRole | undefined,
): UserRole {
  if (isAdminEmail(email)) {
    return "ADMIN";
  }

  if (currentRole === "ADMIN") {
    return "ADMIN";
  }

  return "USER";
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
  let resolvedUserId = await resolveUserId(userId, normalizedEmail);

  if (!resolvedUserId) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    resolvedUserId = await resolveUserId(userId, normalizedEmail);
  }

  if (!resolvedUserId) {
    console.warn(
      "[planlet] login tracking skipped: user not found for",
      normalizedEmail,
    );
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { id: resolvedUserId },
    select: { role: true, lastLoginAt: true },
  });
  const role = resolveSignInRole(trimmedEmail, existing?.role);
  const now = new Date();
  const recentlyTracked =
    existing?.lastLoginAt != null &&
    now.getTime() - existing.lastLoginAt.getTime() < RECENT_LOGIN_WINDOW_MS;

  if (recentlyTracked) {
    if (existing?.role !== role) {
      await prisma.user.update({
        where: { id: resolvedUserId },
        data: { role },
      });
    }
    return role;
  }

  await prisma.user.update({
    where: { id: resolvedUserId },
    data: {
      role,
      lastLoginAt: now,
      loginCount: { increment: 1 },
    },
  });

  try {
    await prisma.loginEvent.create({
      data: {
        userId: resolvedUserId,
        email: normalizedEmail,
        provider: provider ?? "google",
      },
    });
  } catch (error) {
    console.warn("[planlet] login event log failed:", error);
  }

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
