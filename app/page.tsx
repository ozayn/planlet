import { auth } from "@/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PlanletLogo } from "@/components/planlet-logo";
import { PRODUCT } from "@/config/product";

type HomePageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  if (session?.user) {
    const { redirect } = await import("next/navigation");
    redirect(callbackUrl ?? "/today");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-10 text-center">
          <div className="mb-5 flex justify-center">
            <PlanletLogo size={56} />
          </div>
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            {PRODUCT.name}
          </p>
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground sm:text-[2rem]">
            {PRODUCT.tagline}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Plan your day without turning it into a busy calendar.
          </p>
        </div>

        <div className="space-y-6">
          <GoogleSignInButton callbackUrl={callbackUrl ?? "/today"} />

          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-muted-light" aria-hidden="true">
                ·
              </span>
              <span>Write or speak a messy plan</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-light" aria-hidden="true">
                ·
              </span>
              <span>Turn it into tasks, intentions, and notes</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-light" aria-hidden="true">
                ·
              </span>
              <span>Share a quiet update with someone you trust</span>
            </li>
          </ul>

          <p className="text-center text-xs text-muted-light">
            Private reflections stay private.
          </p>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-2 px-6 py-8 text-xs text-muted-light">
        <span className="h-1.5 w-4 rounded-sm bg-accent-red" aria-hidden="true" />
        <span className="h-1.5 w-4 rounded-sm bg-accent-blue" aria-hidden="true" />
        <span className="h-1.5 w-4 rounded-sm bg-accent-yellow" aria-hidden="true" />
      </footer>
    </div>
  );
}
