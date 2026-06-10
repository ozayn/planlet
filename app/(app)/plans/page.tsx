import { auth } from "@/auth";
import { CreatePlanButtons } from "@/components/plans/create-plan-buttons";
import { NewPlanLink } from "@/components/plans/new-plan-link";
import { PlanADateCard } from "@/components/plans/plan-a-date-card";
import { PlanAWeekCard } from "@/components/plans/plan-a-week-card";
import { PlanList } from "@/components/plans/plan-list";
import { PlansEmptyState } from "@/components/plans/plans-empty-state";
import { SharedPlanList } from "@/components/plans/shared-plan-list";
import { UpcomingDayPlans } from "@/components/plans/upcoming-day-plans";
import { UpcomingWeekPlans } from "@/components/plans/upcoming-week-plans";
import { PageHeader } from "@/components/page-header";
import { getSharedPlansForUser } from "@/lib/plan-sharing";
import {
  getPlansByType,
  getUpcomingDayPlans,
  getUpcomingWeekPlans,
} from "@/lib/plans";

export default async function PlansPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [plans, sharedPlans, upcomingDayPlans, upcomingWeekPlans] =
    await Promise.all([
      getPlansByType(userId),
      getSharedPlansForUser(userId),
      getUpcomingDayPlans(userId),
      getUpcomingWeekPlans(userId),
    ]);
  const hasPlans = plans.length > 0;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Plans"
        subtitle="Daily, weekly, monthly, and yearly intentions."
        action={<NewPlanLink />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PlanADateCard />
        <PlanAWeekCard />
      </div>

      <div>
        <h2 className="ui-label mb-4">Upcoming daily plans</h2>
        <UpcomingDayPlans plans={upcomingDayPlans} />
      </div>

      <div>
        <h2 className="ui-label mb-4">Upcoming weekly plans</h2>
        <UpcomingWeekPlans plans={upcomingWeekPlans} />
      </div>

      <div>
        <h2 className="ui-label mb-4">Shared with me</h2>
        <SharedPlanList
          plans={sharedPlans}
          emptyMessage="No plans have been shared with you yet."
        />
      </div>

      {hasPlans ? (
        <div>
          <h2 className="ui-label mb-4">Create by type</h2>
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
