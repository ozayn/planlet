import { createTodayPlanAction } from "@/app/(app)/plans/actions";

export function CreateTodayPlanButton() {
  return (
    <form action={createTodayPlanAction}>
      <button type="submit" className="ui-btn-primary w-full">
        Create today&apos;s plan
      </button>
    </form>
  );
}
