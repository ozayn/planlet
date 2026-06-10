import { auth } from "@/auth";
import { NewPlanLink } from "@/components/plans/new-plan-link";
import { PlanList } from "@/components/plans/plan-list";
import { PlanQuickOpen } from "@/components/plans/plan-quick-open";
import { PlansEmptyState } from "@/components/plans/plans-empty-state";
import { SharedPlanList } from "@/components/plans/shared-plan-list";
import { PageHeader } from "@/components/page-header";
import { getSharedPlansForUser } from "@/lib/plan-sharing";
import { getPlansByType } from "@/lib/plans";

export default async function PlansPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [plans, sharedPlans] = await Promise.all([
    getPlansByType(userId),
    getSharedPlansForUser(userId),
  ]);
  const hasPlans = plans.length > 0;

  return (
    <section className="ui-plans-page space-y-5">
      <PageHeader
        title="Plans"
        subtitle="Daily, weekly, monthly, yearly."
        action={<NewPlanLink className="ui-btn-compact min-h-9" />}
      />

      <PlanQuickOpen />

      {sharedPlans.length > 0 ? (
        <section className="ui-plans-section">
          <h2 className="ui-plans-section-title">Shared with me</h2>
          <SharedPlanList plans={sharedPlans} />
        </section>
      ) : null}

      <section className="ui-plans-section">
        <h2 className="ui-plans-section-title">Your plans</h2>
        {hasPlans ? (
          <PlanList
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
    </section>
  );
}
