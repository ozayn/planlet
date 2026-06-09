import type { UserRole } from "@/app/generated/prisma/client";
import { isAdminEmail } from "@/lib/auth-allowlist";
import { prisma } from "@/lib/prisma";

export async function syncUserRoleOnSignIn(
  userId: string,
  email: string,
): Promise<UserRole> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (isAdminEmail(email)) {
    if (existing?.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "ADMIN" },
      });
    }
    return "ADMIN";
  }

  if (existing?.role === "ADMIN") {
    return "ADMIN";
  }

  if (existing?.role !== "USER") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "USER" },
    });
  }

  return existing?.role ?? "USER";
}

export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN";
}
