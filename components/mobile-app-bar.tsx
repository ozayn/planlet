"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { NotificationBell } from "@/components/notification-bell";
import { PlanletLogo } from "@/components/planlet-logo";
import { ProfileMenu } from "@/components/profile-menu";
import type { SerializedNotification } from "@/lib/notification-serialize";

type MobileAppBarProps = {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
  canGiveFeedback?: boolean;
  signOutButton: React.ReactNode;
  leadingAction?: ReactNode;
  unreadNotificationCount?: number;
  notifications?: SerializedNotification[];
};

export function MobileAppBar({
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  canGiveFeedback = false,
  signOutButton,
  leadingAction,
  unreadNotificationCount = 0,
  notifications = [],
}: MobileAppBarProps) {
  return (
    <header className="ui-mobile-app-bar sticky top-0 z-50 shrink-0 border-b border-border-soft bg-surface/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur lg:hidden">
      <div className="ui-mobile-app-bar-inner mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-1">
          {leadingAction}
          <Link
            href="/today"
            className="flex items-center text-foreground transition-opacity hover:opacity-80"
            aria-label="Planlet home"
          >
            <PlanletLogo size={28} />
          </Link>
        </div>

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
            canGiveFeedback={canGiveFeedback}
            signOutButton={signOutButton}
            compact
            showThemeInMenu
          />
        </div>
      </div>
    </header>
  );
}
