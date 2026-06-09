import { auth } from "@/auth";
import { CreatePlanButtons } from "@/components/plans/create-plan-buttons";
import { NewPlanLink } from "@/components/plans/new-plan-link";
import { PlanList } from "@/components/plans/plan-list";
import { PlansEmptyState } from "@/components/plans/plans-empty-state";
import { PageHeader } from "@/components/page-header";
import { getPlansByType } from "@/lib/plans";

export default async function PlansPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const plans = await getPlansByType(userId);
  const hasPlans = plans.length > 0;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Plans"
        subtitle="Daily, monthly, and yearly intentions — structured but flexible."
      />

      <NewPlanLink fullWidth />

      {hasPlans ? (
        <div>
          <h2 className="ui-label mb-4">Quick actions</h2>
          <CreatePlanButtons />
        </div>
      ) : null}

      <div>
        <h2 className="ui-label mb-4">Recent plans</h2>
        {hasPlans ? (
          <PlanList
            plans={plans.map((plan) => ({
              id: plan.id,
              title: plan.title,
              type: plan.type,
              dateStart: plan.dateStart,
              dateEnd: plan.dateEnd,
              itemCount: plan._count.items,
            }))}
          />
        ) : (
          <PlansEmptyState />
        )}
      </div>
    </section>
  );
}
