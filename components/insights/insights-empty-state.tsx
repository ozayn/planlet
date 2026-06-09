import Link from "next/link";

export function InsightsEmptyState() {
  return (
    <article className="rounded-2xl border border-dashed border-stone-200 bg-white/70 px-5 py-10 text-center">
      <p className="text-sm leading-relaxed text-stone-600">
        Nothing to reflect on yet this month. When you add plans and items,
        gentle observations will appear here.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/today"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 hover:border-stone-300"
        >
          Go to Today
        </Link>
        <Link
          href="/plans/new"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900"
        >
          New plan
        </Link>
      </div>
    </article>
  );
}
