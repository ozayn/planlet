"use client";

import Link from "next/link";

import { NotificationBell } from "@/components/notification-bell";
import { PlanletLogo } from "@/components/planlet-logo";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SerializedNotification } from "@/lib/notification-serialize";
import { PRODUCT } from "@/config/product";

type DesktopNavProps = {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
  canGiveFeedback?: boolean;
  signOutButton: React.ReactNode;
  unreadNotificationCount?: number;
  notifications?: SerializedNotification[];
};

export function DesktopNav({
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  canGiveFeedback = false,
  signOutButton,
  unreadNotificationCount = 0,
  notifications = [],
}: DesktopNavProps) {
  return (
    <header className="relative z-50 hidden shrink-0 border-b border-border-soft bg-surface md:block">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href="/today"
          className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
        >
          <PlanletLogo size={32} />
          <span className="text-base font-semibold tracking-tight">
            {PRODUCT.name}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
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
            canGiveFeedback={canGiveFeedback}
            signOutButton={signOutButton}
          />
        </div>
      </div>
    </header>
  );
}
