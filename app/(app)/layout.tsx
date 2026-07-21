import { auth } from "@/auth";
import { ReadingDensityApplier } from "@/components/reading-density-applier";
import { ActivityTimerFloatingPill } from "@/components/activity-timer/activity-timer-floating-pill";
import { ActivityTimerNotificationSync } from "@/components/activity-timer/activity-timer-notification-sync";
import { ActivityTimerProvider } from "@/components/activity-timer/activity-timer-context";
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
  canUseActivityTimerFeatures,
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
import { getMobileNavItemsForUser, getReadingDensityForUser } from "@/lib/user-preferences";
import { getActiveActivityTimerSession } from "@/lib/activity-timer";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = isAdminRole(session?.user?.role);

  const timerAccess = canUseActivityTimerFeatures(session?.user ?? {});

  const [unreadNotificationCount, notifications, storedMobileNavItems, activeTimerSession, readingDensity] = userId
    ? await Promise.all([
        getHeaderUnreadCount(userId),
        getNotificationsForUser(userId),
        getMobileNavItemsForUser(userId),
        timerAccess ? getActiveActivityTimerSession(userId) : Promise.resolve(null),
        getReadingDensityForUser(userId),
      ])
    : [0, [], [], null, "compact" as const];

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
    canUseActivityTimerFeatures: canUseActivityTimerFeatures(
      session?.user ?? {},
    ),
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
      <ReadingDensityApplier density={readingDensity} />
      {session?.user?.timezoneMode === "AUTOMATIC" ? (
        <BrowserTimezoneDetector enabled />
      ) : null}
      <ActivityTimerProvider initialActiveSession={activeTimerSession}>
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
        {timerAccess ? <ActivityTimerFloatingPill /> : null}
        {timerAccess ? <ActivityTimerNotificationSync /> : null}
      </ActivityTimerProvider>
    </>
  );
}
