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
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-24 pt-8 md:max-w-3xl md:px-8 md:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
