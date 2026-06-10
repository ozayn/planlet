import { auth } from "@/auth";
import { NewPlanLink } from "@/components/plans/new-plan-link";
import { PlanADateCard } from "@/components/plans/plan-a-date-card";
import { PlanAWeekCard } from "@/components/plans/plan-a-week-card";
import { PlanList } from "@/components/plans/plan-list";
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
    <section className="space-y-6">
      <PageHeader
        title="Plans"
        subtitle="Daily, weekly, monthly, and yearly intentions."
        action={<NewPlanLink />}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Quick open</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <PlanADateCard />
          <PlanAWeekCard />
        </div>
      </div>

      {sharedPlans.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Shared with me</h2>
          <SharedPlanList plans={sharedPlans} />
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Your plans</h2>
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
