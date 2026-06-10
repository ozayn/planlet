"use client";

import Link from "next/link";

import { NotificationBell } from "@/components/notification-bell";
import { PlanletLogo } from "@/components/planlet-logo";
import { ProfileMenu } from "@/components/profile-menu";
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
    <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-2.5">
        <Link
          href="/today"
          className="flex items-center text-foreground transition-opacity hover:opacity-80"
          aria-label="Planlet home"
        >
          <PlanletLogo size={28} />
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationBell
            unreadCount={unreadNotificationCount}
            notifications={notifications}
          />
          <ProfileMenu
            name={userName}
            email={userEmail}
            image={userImage}
            isAdmin={isAdmin}
            signOutButton={signOutButton}
            compact
            showThemeInMenu
          />
        </div>
      </div>
    </header>
  );
}
