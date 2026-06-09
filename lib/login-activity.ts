import { prisma } from "@/lib/prisma";

export async function recordUserLogin(
  userId: string,
  email: string,
  provider?: string | null,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: now,
        loginCount: { increment: 1 },
      },
    }),
    prisma.loginEvent.create({
      data: {
        userId,
        email: normalizedEmail,
        provider: provider ?? "google",
      },
    }),
  ]);
}
