import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CreateWeekPlanButton } from "@/components/plans/create-week-plan-button";
import { PlanEditor } from "@/components/plans/plan-editor";
import { WeekPlanNav } from "@/components/plans/week-plan-nav";
import { PageHeader } from "@/components/page-header";
import {
  formatPlanDateLabel,
  formatWeekStartString,
  getWeekRange,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import { getPlanSharesForOwner } from "@/lib/plan-sharing";
import { getWeekPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";

type WeekPlanPageProps = {
  params: Promise<{ date: string }>;
};

export default async function WeekPlanPage({ params }: WeekPlanPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const { date: dateString } = await params;

  if (!isValidDateString(dateString)) {
    notFound();
  }

  const date = parseDateString(dateString);
  const weekStart = formatWeekStartString(date);
  const { start: weekRangeStart, end: weekRangeEnd } = getWeekRange(date);
  const plan = await getWeekPlan(userId, date);
  const weekLabel = formatPlanDateLabel(
    weekRangeStart,
    "WEEK",
    plan?.dateEnd ?? weekRangeEnd,
  );

  if (!plan) {
    return (
      <section className="space-y-6">
        <PageHeader
          title={weekLabel}
          subtitle="Weekly plan"
          action={
            <Link href="/plans" className="ui-text-link">
              All plans
            </Link>
          }
        />

        <WeekPlanNav currentWeekStart={weekStart} />

        <div className="ui-empty-state space-y-4">
          <p className="text-sm text-muted">No weekly plan for this week yet.</p>
          <CreateWeekPlanButton dateString={weekStart} />
        </div>
      </section>
    );
  }

  const platformShares = await getPlanSharesForOwner(plan.id, userId);

  return (
    <section className="space-y-6">
      <PageHeader
        title={weekLabel}
        subtitle="Weekly plan"
        action={
          <Link href="/plans" className="ui-text-link">
            All plans
          </Link>
        }
      />

      <WeekPlanNav currentWeekStart={weekStart} />

      <PlanEditor
        plan={serializePlan(plan)}
        showCopyExport
        showPlatformShare
        platformShares={platformShares}
      />
    </section>
  );
}
