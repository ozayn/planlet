import { NewPlanLink } from "@/components/plans/new-plan-link";

export function PlansEmptyState() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
      <span>No plans yet.</span>
      <NewPlanLink />
    </div>
  );
}
