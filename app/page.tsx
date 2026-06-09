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
        <div className="mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <PlanletLogo size={56} />
          </div>
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            {PRODUCT.name}
          </p>
          <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-foreground">
            {PRODUCT.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted" dir="auto">
            {PRODUCT.description}
          </p>
        </div>

        <div className="space-y-4">
          <GoogleSignInButton callbackUrl={callbackUrl ?? "/today"} />
          <p className="text-center text-xs text-muted-light">
            Soft plans, not a calendar replacement.
          </p>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-3 px-6 py-10 text-xs text-muted-light">
        <span className="h-2 w-2 rounded-sm bg-accent-red" aria-hidden="true" />
        <span className="h-2 w-2 rounded-sm bg-accent-blue" aria-hidden="true" />
        <span className="h-2 w-2 rounded-sm bg-accent-yellow" aria-hidden="true" />
        <span>Farsi-friendly input · Mobile-first</span>
      </footer>
    </div>
  );
}
