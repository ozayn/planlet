import { prisma } from "@/lib/prisma";

export async function touchUserSeen(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    console.warn("[planlet] Failed to update user lastSeenAt");
  }
}

/** @deprecated Use touchUserSeen — kept for existing call sites. */
export const touchUserSeenSafely = touchUserSeen;
