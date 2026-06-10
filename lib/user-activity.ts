import { prisma } from "@/lib/prisma";

const SEEN_THROTTLE_MS = 5 * 60 * 1000;

export async function touchUserSeen(userId: string): Promise<void> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenAt: true },
  });

  if (!user) {
    return;
  }

  if (
    user.lastSeenAt &&
    now.getTime() - user.lastSeenAt.getTime() < SEEN_THROTTLE_MS
  ) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: now },
  });
}

/** Best-effort activity tracking; never throws into user-facing flows. */
export async function touchUserSeenSafely(userId: string): Promise<void> {
  try {
    await touchUserSeen(userId);
  } catch (error) {
    console.warn("[planlet] touchUserSeen failed:", error);
  }
}
