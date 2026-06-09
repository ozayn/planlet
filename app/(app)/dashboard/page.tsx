import Link from "next/link";

import { auth } from "@/auth";
import { CreateTodayPlanButton } from "@/components/plans/create-today-plan-button";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { PageHeader } from "@/components/page-header";
import { PRODUCT } from "@/config/product";
import { getTodayPlan, getPlansByType } from "@/lib/plans";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [todayPlan, plans] = await Promise.all([
    getTodayPlan(userId),
    getPlansByType(userId),
  ]);

  const todayItemCount = todayPlan?.items.length ?? 0;
  const recentCount = plans.length;

  return (
    <section className="space-y-8">
      <PageHeader
        title={PRODUCT.name}
        subtitle="A calm home for your plans."
      />

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-stone-800">Today</h2>
        {todayPlan ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-stone-600" dir="auto">
              <span className="font-medium text-stone-900">{todayPlan.title}</span>
              {" · "}
              {todayItemCount} item{todayItemCount === 1 ? "" : "s"}
            </p>
            <Link
              href="/today"
              className="inline-flex min-h-11 items-center rounded-xl border border-stone-200 px-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300"
            >
              Open today&apos;s plan
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-relaxed text-stone-500">
              No plan for today yet. Start with a messy list — structure it when
              you are ready.
            </p>
            <CreateTodayPlanButton />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DashboardCard
          href="/today"
          title="Today"
          description="See what matters right now."
        />
        <DashboardCard
          href="/plans/new"
          title="New plan"
          description="Paste or record messy notes, then structure them."
        />
        <DashboardCard
          href="/plans"
          title="Recent plans"
          description={
            recentCount > 0
              ? `${recentCount} plan${recentCount === 1 ? "" : "s"} saved so far.`
              : "Your daily, monthly, and yearly plans live here."
          }
        />
        <DashboardCard
          href="/insights"
          title="Insights"
          description="A quiet look at what your plans have been holding."
        />
      </div>
    </section>
  );
}
