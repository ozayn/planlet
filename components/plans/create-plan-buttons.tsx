import { createPlanAction } from "@/app/(app)/plans/actions";

export function CreatePlanButtons() {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <form action={createPlanAction.bind(null, "DAY")}>
        <button type="submit" className="ui-btn-secondary w-full">
          Daily plan
        </button>
      </form>
      <form action={createPlanAction.bind(null, "MONTH")}>
        <button type="submit" className="ui-btn-secondary w-full">
          Monthly plan
        </button>
      </form>
      <form action={createPlanAction.bind(null, "YEAR")}>
        <button type="submit" className="ui-btn-secondary w-full">
          Yearly plan
        </button>
      </form>
    </div>
  );
}
