import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopNav } from "@/components/desktop-nav";
import { MobileAppBar } from "@/components/mobile-app-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { isAdminRole } from "@/lib/auth-roles";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DesktopNav
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isAdmin={isAdminRole(session?.user?.role)}
        signOutButton={<SignOutButton />}
      />
      <MobileAppBar
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isAdmin={isAdminRole(session?.user?.role)}
        signOutButton={<SignOutButton />}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-24 pt-5 md:max-w-3xl md:px-8 md:pb-10 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
