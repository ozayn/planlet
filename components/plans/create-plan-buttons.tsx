import Link from "next/link";

import { createPlanAction } from "@/app/(app)/plans/actions";
import { NewPlanLink } from "@/components/plans/new-plan-link";

const buttonClass =
  "flex min-h-12 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50";

export function CreatePlanButtons() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Link href="/today" className={buttonClass}>
        Today
      </Link>
      <NewPlanLink fullWidth />
      <form action={createPlanAction.bind(null, "DAY")}>
        <button type="submit" className={`${buttonClass} w-full`}>
          New daily plan
        </button>
      </form>
      <form action={createPlanAction.bind(null, "MONTH")}>
        <button type="submit" className={`${buttonClass} w-full`}>
          New monthly plan
        </button>
      </form>
      <form action={createPlanAction.bind(null, "YEAR")}>
        <button type="submit" className={`${buttonClass} w-full`}>
          New yearly plan
        </button>
      </form>
    </div>
  );
}
