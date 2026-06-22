"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationBell } from "@/components/notification-bell";
import { PlanletLogo } from "@/components/planlet-logo";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SerializedNotification } from "@/lib/notification-serialize";
import { getMainNavItems, isMainNavActive } from "@/lib/main-nav";
import { PRODUCT } from "@/config/product";

type DesktopNavProps = {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
  canGiveFeedback?: boolean;
  canUseTherapyThoughts?: boolean;
  canUseJobTrackerFeatures?: boolean;
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
  canUseTherapyThoughts = false,
  canUseJobTrackerFeatures = false,
  signOutButton,
  unreadNotificationCount = 0,
  notifications = [],
}: DesktopNavProps) {
  const pathname = usePathname();
  const navItems = getMainNavItems();

  return (
    <header className="hidden border-b border-border-soft bg-surface md:block">
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
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = isMainNavActive(pathname, item.key);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive ? (
                  <span
                    className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-accent-blue"
                    aria-hidden="true"
                  />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
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
            canUseTherapyThoughts={canUseTherapyThoughts}
            canUseJobTrackerFeatures={canUseJobTrackerFeatures}
            signOutButton={signOutButton}
          />
        </div>
      </div>
    </header>
  );
}
