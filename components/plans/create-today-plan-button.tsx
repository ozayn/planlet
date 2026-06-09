import { createTodayPlanAction } from "@/app/(app)/plans/actions";

export function CreateTodayPlanButton() {
  return (
    <form action={createTodayPlanAction}>
      <button
        type="submit"
        className="min-h-12 w-full rounded-xl bg-teal-800 px-6 text-sm font-medium text-white transition-colors hover:bg-teal-900"
      >
        Create today&apos;s plan
      </button>
    </form>
  );
}
