import { formatRelativeActivityTime } from "@/lib/plan-activity";

type UserSeenSource = {
  lastSeenAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  createdAt: Date;
};

const RECENTLY_SEEN_TITLE = "Last meaningful app action";
const LAST_LOGIN_TITLE = "Last Google sign-in";

export function sortUsersByRecentlySeen<T extends UserSeenSource>(users: T[]): T[] {
  return [...users].sort((a, b) => {
    const aSeen = a.lastSeenAt?.getTime() ?? null;
    const bSeen = b.lastSeenAt?.getTime() ?? null;

    if (aSeen !== null && bSeen !== null) {
      return bSeen - aSeen;
    }

    if (aSeen !== null) {
      return -1;
    }

    if (bSeen !== null) {
      return 1;
    }

    const aLogin = a.lastLoginAt?.getTime() ?? null;
    const bLogin = b.lastLoginAt?.getTime() ?? null;

    if (aLogin !== null && bLogin !== null) {
      return bLogin - aLogin;
    }

    if (aLogin !== null) {
      return -1;
    }

    if (bLogin !== null) {
      return 1;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function formatRecentlySeenLabel(
  user: Pick<UserSeenSource, "lastSeenAt">,
  now = new Date(),
): { label: string; title: string } {
  if (user.lastSeenAt) {
    return {
      label: formatRelativeActivityTime(user.lastSeenAt, now),
      title: RECENTLY_SEEN_TITLE,
    };
  }

  return {
    label: "No activity yet",
    title: RECENTLY_SEEN_TITLE,
  };
}

export function formatLastLoginLabel(
  user: Pick<UserSeenSource, "lastLoginAt" | "loginCount">,
  now = new Date(),
): { label: string; title: string } {
  if (user.lastLoginAt) {
    return {
      label: formatRelativeActivityTime(user.lastLoginAt, now),
      title: LAST_LOGIN_TITLE,
    };
  }

  if (user.loginCount > 0) {
    return {
      label: "Unknown (before tracking)",
      title: LAST_LOGIN_TITLE,
    };
  }

  return {
    label: "Never",
    title: LAST_LOGIN_TITLE,
  };
}
