import { auth } from "@/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
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
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium tracking-wide text-teal-800 uppercase">
            {PRODUCT.name}
          </p>
          <h1 className="text-3xl font-medium tracking-tight text-stone-900">
            {PRODUCT.tagline}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-500" dir="auto">
            {PRODUCT.description}
          </p>
        </div>

        <div className="space-y-4">
          <GoogleSignInButton callbackUrl={callbackUrl ?? "/today"} />
          <p className="text-center text-xs text-stone-400">
            Soft plans, not a calendar replacement.
          </p>
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-xs text-stone-400">
        Farsi-friendly input · Mobile-first · Calm by design
      </footer>
    </div>
  );
}
