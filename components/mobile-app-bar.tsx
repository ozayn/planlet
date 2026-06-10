"use client";

import Link from "next/link";

import { NotificationBell } from "@/components/notification-bell";
import { PlanletLogo } from "@/components/planlet-logo";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SerializedNotification } from "@/lib/notification-serialize";

type MobileAppBarProps = {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
  signOutButton: React.ReactNode;
  unreadNotificationCount?: number;
  notifications?: SerializedNotification[];
};

export function MobileAppBar({
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  signOutButton,
  unreadNotificationCount = 0,
  notifications = [],
}: MobileAppBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
        <Link
          href="/today"
          className="flex items-center text-foreground transition-opacity hover:opacity-80"
          aria-label="Planlet home"
        >
          <PlanletLogo size={28} />
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell
            unreadCount={unreadNotificationCount}
            notifications={notifications}
          />
          <ThemeToggle variant="compact" />
          <ProfileMenu
            name={userName}
            email={userEmail}
            image={userImage}
            isAdmin={isAdmin}
            signOutButton={signOutButton}
            compact
          />
        </div>
      </div>
    </header>
  );
}
