"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  AppNavDrawerProvider,
  AppNavMenuButton,
} from "@/components/app-nav/app-nav-drawer";
import { AppNavSidebar } from "@/components/app-nav/app-nav-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileAppBar } from "@/components/mobile-app-bar";
import type { AppNavAccess } from "@/lib/app-nav";
import type { MobileNavRenderItem } from "@/lib/mobile-nav";
import type { SerializedNotification } from "@/lib/notification-serialize";

type AppLayoutShellProps = {
  access: AppNavAccess;
  mobileNavItems: MobileNavRenderItem[];
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  isAdmin?: boolean;
  canGiveFeedback?: boolean;
  signOutButton: ReactNode;
  unreadNotificationCount?: number;
  notifications?: SerializedNotification[];
  children: ReactNode;
};

const LIFE_LAB_NOTE_DETAIL = /^\/life-lab\/[^/]+\/[^/]+$/;
const FLASHCARD_DECK_DETAIL = /^\/life-lab\/flashcards\/[^/]+$/;

export function AppLayoutShell({
  access,
  mobileNavItems,
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  canGiveFeedback = false,
  signOutButton,
  unreadNotificationCount = 0,
  notifications = [],
  children,
}: AppLayoutShellProps) {
  const pathname = usePathname();
  const hideBottomNav = LIFE_LAB_NOTE_DETAIL.test(pathname);
  const isFlashcardDeck = FLASHCARD_DECK_DETAIL.test(pathname);
  // Focused deck view owns its compact top bar (menu + back + title).
  const hideMobileAppBar = isFlashcardDeck;

  return (
    <AppNavDrawerProvider
      access={access}
      pinnedNavItemKeys={mobileNavItems.map((item) => item.key)}
    >
      <div
        className="flex min-h-full flex-1 flex-col overflow-x-clip"
        data-flashcard-shell={isFlashcardDeck ? "focus" : undefined}
      >
        <div className="flex min-h-0 flex-1">
          <AppNavSidebar access={access} />
          <div className="flex min-w-0 flex-1 flex-col">
            <DesktopNav
              userName={userName}
              userEmail={userEmail}
              userImage={userImage}
              isAdmin={isAdmin}
              canGiveFeedback={canGiveFeedback}
              signOutButton={signOutButton}
              unreadNotificationCount={unreadNotificationCount}
              notifications={notifications}
            />
            {hideMobileAppBar ? null : (
              <MobileAppBar
                userName={userName}
                userEmail={userEmail}
                userImage={userImage}
                isAdmin={isAdmin}
                canGiveFeedback={canGiveFeedback}
                signOutButton={signOutButton}
                unreadNotificationCount={unreadNotificationCount}
                notifications={notifications}
                leadingAction={<AppNavMenuButton />}
              />
            )}
            <main
              className={`ui-app-main relative z-0 mx-auto w-full flex-1 ${
                isFlashcardDeck
                  ? "ui-app-main-flashcard max-w-none px-3 pt-3 pb-6 sm:px-4 sm:pt-4 lg:max-w-3xl lg:px-8 lg:pt-8 lg:pb-10"
                  : `max-w-2xl px-5 pt-5 md:max-w-3xl md:px-8 md:pt-8 ${
                      hideBottomNav ? "pb-6 md:pb-10" : "pb-safe-nav md:pb-10"
                    }`
              }`}
            >
              {children}
            </main>
          </div>
        </div>
        {hideBottomNav ? null : <BottomNav items={mobileNavItems} />}
      </div>
    </AppNavDrawerProvider>
  );
}
