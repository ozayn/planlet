import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopNav } from "@/components/desktop-nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DesktopNav userName={session?.user?.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
