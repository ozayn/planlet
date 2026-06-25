import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileAppBar } from "@/components/mobile-app-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { BrowserTimezoneDetector } from "@/components/timezone/browser-timezone-detector";
import { isAdminRole } from "@/lib/auth-roles";
import { canGiveFeedback, canUseBodyJourneyFeatures, canUseCareerJourneyFeatures, canUseCoachingFeatures, canUseJobTrackerFeatures, canUseTherapyThoughts } from "@/lib/roles";
import { serializeNotification } from "@/lib/notification-serialize";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "@/lib/notifications";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userId = session?.user?.id;

  const [unreadNotificationCount, notifications] = userId
    ? await Promise.all([
        getUnreadNotificationCount(userId),
        getNotificationsForUser(userId),
      ])
    : [0, []];

  const serializedNotifications = notifications.map(serializeNotification);

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      {session?.user?.timezoneMode === "AUTOMATIC" ? (
        <BrowserTimezoneDetector enabled />
      ) : null}
      <DesktopNav
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isAdmin={isAdminRole(session?.user?.role)}
        canGiveFeedback={canGiveFeedback(session?.user ?? {})}
        canUseTherapyThoughts={canUseTherapyThoughts(session?.user ?? {})}
        canUseJobTrackerFeatures={canUseJobTrackerFeatures(session?.user ?? {})}
        canUseCareerJourneyFeatures={canUseCareerJourneyFeatures(session?.user ?? {})}
        canUseBodyJourneyFeatures={canUseBodyJourneyFeatures(session?.user ?? {})}
        canUseCoachingFeatures={canUseCoachingFeatures(session?.user ?? {})}
        signOutButton={<SignOutButton variant="quiet" className="ui-profile-menu-sign-out" />}
        unreadNotificationCount={unreadNotificationCount}
        notifications={serializedNotifications}
      />
      <MobileAppBar
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isAdmin={isAdminRole(session?.user?.role)}
        canGiveFeedback={canGiveFeedback(session?.user ?? {})}
        canUseTherapyThoughts={canUseTherapyThoughts(session?.user ?? {})}
        canUseJobTrackerFeatures={canUseJobTrackerFeatures(session?.user ?? {})}
        canUseCareerJourneyFeatures={canUseCareerJourneyFeatures(session?.user ?? {})}
        canUseBodyJourneyFeatures={canUseBodyJourneyFeatures(session?.user ?? {})}
        canUseCoachingFeatures={canUseCoachingFeatures(session?.user ?? {})}
        signOutButton={<SignOutButton variant="quiet" className="ui-profile-menu-sign-out" />}
        unreadNotificationCount={unreadNotificationCount}
        notifications={serializedNotifications}
      />
      <main className="ui-app-main relative z-0 mx-auto w-full max-w-2xl flex-1 px-5 pb-safe-nav pt-5 md:max-w-3xl md:px-8 md:pb-10 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
