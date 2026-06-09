import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";

export function PlansEmptyState() {
  return (
    <article className="ui-empty-state space-y-6">
      <p className="text-sm text-muted">No plans saved yet.</p>
      <CreateTodayPlanButton />
    </article>
  );
}
