import { auth } from "@/auth";
import { NewPlanLink } from "@/components/plans/new-plan-link";
import { PlanOpenSection } from "@/components/plans/plan-open-section";
import { RecentPlanList } from "@/components/plans/plan-list";
import { PlansEmptyState } from "@/components/plans/plans-empty-state";
import { SharedPlanList } from "@/components/plans/shared-plan-list";
import { PageHeader } from "@/components/page-header";
import { getSharedPlansForUser } from "@/lib/plan-sharing";
import { getRecentPlansForList } from "@/lib/plans";

export default async function PlansPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [plans, sharedPlans] = await Promise.all([
    getRecentPlansForList(userId),
    getSharedPlansForUser(userId),
  ]);
  const hasPlans = plans.length > 0;

  return (
    <section className="ui-plans-page space-y-6">
      <PageHeader
        title="Plans"
        action={<NewPlanLink className="ui-btn-compact min-h-9" />}
      />

      <PlanOpenSection />

      <section className="ui-plans-section space-y-2">
        <h2 className="text-sm font-medium text-foreground">Recent plans</h2>
        {hasPlans ? (
          <RecentPlanList
            plans={plans.map((plan) => ({
              id: plan.id,
              title: plan.title,
              type: plan.type,
              dateStart: plan.dateStart,
              dateEnd: plan.dateEnd,
              itemCount: plan._count.items,
              updatedAt: plan.updatedAt,
            }))}
          />
        ) : (
          <PlansEmptyState />
        )}
      </section>

      <section className="ui-plans-section space-y-2">
        <h2 className="text-sm font-medium text-foreground">Shared with me</h2>
        {sharedPlans.length > 0 ? (
          <SharedPlanList plans={sharedPlans} />
        ) : (
          <p className="text-sm text-muted">Nothing shared with you yet.</p>
        )}
      </section>
    </section>
  );
}
