import { auth } from "@/auth";
import { AppLayoutShell } from "@/components/app-layout-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { BrowserTimezoneDetector } from "@/components/timezone/browser-timezone-detector";
import { isAdminRole } from "@/lib/auth-roles";
import {
  canGiveFeedback,
  canUseBodyJourneyFeatures,
  canUseCareerJourneyFeatures,
  canUseCoachingFeatures,
  canUseJobTrackerFeatures,
  canUseLearningJourneyFeatures,
  canUseLifeLabFeatures,
  canUseIdeasFeatures,
} from "@/lib/roles";
import { serializeNotification } from "@/lib/notification-serialize";
import {
  buildMobileNavRenderItems,
  resolveMobileNavItems,
} from "@/lib/mobile-nav";
import {
  getNotificationsForUser,
} from "@/lib/notifications";
import {
  getHeaderUnreadCount,
} from "@/lib/poke";
import { getMobileNavItemsForUser } from "@/lib/user-preferences";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = isAdminRole(session?.user?.role);

  const [unreadNotificationCount, notifications, storedMobileNavItems] = userId
    ? await Promise.all([
        getHeaderUnreadCount(userId),
        getNotificationsForUser(userId),
        getMobileNavItemsForUser(userId),
      ])
    : [0, [], []];

  const serializedNotifications = notifications.map(serializeNotification);
  const access = {
    isAdmin,
    canUseCoachingFeatures: canUseCoachingFeatures(session?.user ?? {}),
    canUseBodyJourneyFeatures: canUseBodyJourneyFeatures(session?.user ?? {}),
    canUseLearningJourneyFeatures: canUseLearningJourneyFeatures(
      session?.user ?? {},
    ),
    canUseLifeLabFeatures: canUseLifeLabFeatures(session?.user ?? {}),
    canUseIdeasFeatures: canUseIdeasFeatures(session?.user ?? {}),
    canUseJobTrackerFeatures: canUseJobTrackerFeatures(session?.user ?? {}),
    canUseCareerJourneyFeatures: canUseCareerJourneyFeatures(
      session?.user ?? {},
    ),
  };
  const mobileNavItems = buildMobileNavRenderItems(
    resolveMobileNavItems(storedMobileNavItems, access),
    access,
  );

  return (
    <>
      {session?.user?.timezoneMode === "AUTOMATIC" ? (
        <BrowserTimezoneDetector enabled />
      ) : null}
      <AppLayoutShell
        access={access}
        mobileNavItems={mobileNavItems}
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isAdmin={isAdmin}
        canGiveFeedback={canGiveFeedback(session?.user ?? {})}
        signOutButton={
          <SignOutButton variant="quiet" className="ui-profile-menu-sign-out" />
        }
        unreadNotificationCount={unreadNotificationCount}
        notifications={serializedNotifications}
      >
        {children}
      </AppLayoutShell>
    </>
  );
}
