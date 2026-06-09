import Link from "next/link";

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
          <p className="mb-3 text-sm font-medium tracking-wide text-teal-800 uppercase">
            {PRODUCT.name}
          </p>
          <h1 className="text-2xl font-medium tracking-tight text-stone-900">
            {isAccessDenied ? "Private workspace" : "Sign-in problem"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            {isAccessDenied
              ? "This Planlet workspace is private. Your Google account is not on the allowlist."
              : "Something went wrong while signing in. Please try again."}
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-6 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
