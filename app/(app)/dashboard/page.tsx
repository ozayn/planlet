import Link from "next/link";

import { auth } from "@/auth";
import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { PageHeader } from "@/components/page-header";
import { PRODUCT } from "@/config/product";
import { getSharedPlansForUser } from "@/lib/plan-sharing";
import { getTodayPlan, getPlansByType } from "@/lib/plans";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [todayPlan, plans, sharedPlans] = await Promise.all([
    getTodayPlan(userId),
    getPlansByType(userId),
    getSharedPlansForUser(userId),
  ]);

  const todayItemCount = todayPlan?.items.length ?? 0;
  const recentCount = plans.length;
  const sharedCount = sharedPlans.length;

  return (
    <section className="space-y-8">
      <PageHeader
        title={PRODUCT.name}
        subtitle="A calm home for your plans."
      />

      <article className="ui-card-padded relative overflow-hidden">
        <span
          className="absolute inset-y-5 start-0 w-1 rounded-full ui-accent-bar-red"
          aria-hidden="true"
        />
        <h2 className="ps-3 text-sm font-semibold text-foreground">Today</h2>
        {todayPlan ? (
          <div className="mt-4 space-y-4 ps-3">
            <p className="text-sm text-muted" dir="auto">
              <span className="font-medium text-foreground">{todayPlan.title}</span>
              {" · "}
              {todayItemCount} item{todayItemCount === 1 ? "" : "s"}
            </p>
            <Link href="/today" className="ui-btn-secondary inline-flex">
              Open today&apos;s plan
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4 ps-3">
            <p className="text-sm leading-relaxed text-muted">
              No plan for today yet. Start with a messy list — structure it when
              you are ready.
            </p>
            <CreateTodayPlanButton />
          </div>
        )}
      </article>

      <div className="grid gap-3 sm:grid-cols-2">
        <DashboardCard
          href="/today"
          title="Today"
          description="See what matters right now."
          accentIndex={0}
        />
        <DashboardCard
          href="/plans/new"
          title="New plan"
          description="Paste or record messy notes, then structure them."
          accentIndex={1}
        />
        <DashboardCard
          href="/plans"
          title="Recent plans"
          description={
            recentCount > 0
              ? `${recentCount} plan${recentCount === 1 ? "" : "s"} saved so far.`
              : "Your daily, monthly, and yearly plans live here."
          }
          accentIndex={2}
        />
        <DashboardCard
          href="/insights"
          title="Insights"
          description="A quiet look at what your plans have been holding."
          accentIndex={0}
        />
        {sharedCount > 0 ? (
          <DashboardCard
            href="/plans"
            title="Shared with me"
            description={`${sharedCount} plan${sharedCount === 1 ? "" : "s"} from other users.`}
            accentIndex={1}
          />
        ) : null}
      </div>
    </section>
  );
}
