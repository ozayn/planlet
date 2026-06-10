import { formatRelativeActivityTime } from "@/lib/plan-activity";

type UserSeenSource = {
  lastSeenAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  createdAt: Date;
};

export function getEffectiveLastSeenAt(
  user: Pick<UserSeenSource, "lastSeenAt" | "lastLoginAt">,
): Date | null {
  return user.lastSeenAt ?? user.lastLoginAt ?? null;
}

export function sortUsersByRecentlySeen<T extends UserSeenSource>(users: T[]): T[] {
  return [...users].sort((a, b) => {
    const aSeen = getEffectiveLastSeenAt(a);
    const bSeen = getEffectiveLastSeenAt(b);

    if (!aSeen && !bSeen) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }

    if (!aSeen) {
      return 1;
    }

    if (!bSeen) {
      return -1;
    }

    return bSeen.getTime() - aSeen.getTime();
  });
}

export function formatRecentlySeenLabel(
  user: UserSeenSource,
  now = new Date(),
): { label: string; title?: string } {
  if (user.lastSeenAt) {
    return {
      label: formatRelativeActivityTime(user.lastSeenAt, now),
    };
  }

  if (user.lastLoginAt) {
    return {
      label: formatRelativeActivityTime(user.lastLoginAt, now),
      title: "Last login",
    };
  }

  if (user.loginCount > 0) {
    return {
      label: "Unknown (before tracking)",
      title: "Last login",
    };
  }

  return { label: "Never" };
}
