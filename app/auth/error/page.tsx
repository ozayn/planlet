import Link from "next/link";

import { PlanletLogo } from "@/components/planlet-logo";
import { PRODUCT } from "@/config/product";

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const isAccessDenied = error === "AccessDenied";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <PlanletLogo size={48} />
          </div>
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            {PRODUCT.name}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isAccessDenied ? "Private workspace" : "Sign-in problem"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {isAccessDenied
              ? "This Planlet workspace is private. Your Google account is not on the allowlist."
              : "Something went wrong while signing in. Please try again."}
          </p>
        </div>

        <div className="mt-8">
          <Link href="/" className="ui-btn-secondary flex w-full">
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
