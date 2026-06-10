import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileAppBar } from "@/components/mobile-app-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { isAdminRole } from "@/lib/auth-roles";
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
    <div className="flex min-h-full flex-1 flex-col">
      <DesktopNav
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isAdmin={isAdminRole(session?.user?.role)}
        signOutButton={<SignOutButton />}
        unreadNotificationCount={unreadNotificationCount}
        notifications={serializedNotifications}
      />
      <MobileAppBar
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isAdmin={isAdminRole(session?.user?.role)}
        signOutButton={<SignOutButton />}
        unreadNotificationCount={unreadNotificationCount}
        notifications={serializedNotifications}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-24 pt-5 md:max-w-3xl md:px-8 md:pb-10 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
