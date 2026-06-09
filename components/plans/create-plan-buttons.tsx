import Link from "next/link";

import { createPlanAction } from "@/app/(app)/plans/actions";
import { NewPlanLink } from "@/components/plans/new-plan-link";

export function CreatePlanButtons() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Link href="/today" className="ui-btn-secondary flex">
        Today
      </Link>
      <NewPlanLink fullWidth />
      <form action={createPlanAction.bind(null, "DAY")}>
        <button type="submit" className="ui-btn-secondary w-full">
          New daily plan
        </button>
      </form>
      <form action={createPlanAction.bind(null, "MONTH")}>
        <button type="submit" className="ui-btn-secondary w-full">
          New monthly plan
        </button>
      </form>
      <form action={createPlanAction.bind(null, "YEAR")}>
        <button type="submit" className="ui-btn-secondary w-full">
          New yearly plan
        </button>
      </form>
    </div>
  );
}
