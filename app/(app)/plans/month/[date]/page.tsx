import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CreateMonthPlanButton } from "@/components/plans/create-month-plan-button";
import { MonthPlanContent } from "@/components/plans/month-plan-content";
import { MonthPlanNav } from "@/components/plans/month-plan-nav";
import {
  formatMonthStartString,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import {
  getPlanSharesForOwner,
  getRecentShareRecipients,
} from "@/lib/plan-sharing";
import { getPeriodSummaryHref } from "@/lib/period-summary-links";
import { getPlanReflectionData } from "@/lib/reflection-data";
import { buildMonthPlanPageTitle } from "@/lib/month-plan-header";
import { getMonthPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanItemViewForUser } from "@/lib/user-preferences";

type MonthPlanPageProps = {
  params: Promise<{ date: string }>;
};

export default async function MonthPlanPage({ params }: MonthPlanPageProps) {
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
  const monthStart = formatMonthStartString(date);
  const plan = await getMonthPlan(userId, date);
  const monthLabel = buildMonthPlanPageTitle(monthStart);

  if (!plan) {
    return (
      <section className="ui-page-stack space-y-6">
        <header className="ui-page-header mb-0">
          <h1
            className="text-[1.625rem] font-semibold tracking-tight text-foreground"
            dir="auto"
          >
            {monthLabel}
          </h1>
          <p className="mt-1 text-sm text-muted">No list for this month yet.</p>
        </header>

        <MonthPlanNav currentMonthStart={monthStart} />

        <div className="ui-empty-state space-y-4">
          <p className="text-sm text-muted">No monthly plan for this month yet.</p>
          <CreateMonthPlanButton dateString={monthStart} />
        </div>
      </section>
    );
  }

  const [platformShares, planItemView, reflectionData, recentShareRecipients] =
    await Promise.all([
      getPlanSharesForOwner(plan.id, userId),
      getPlanItemViewForUser(userId),
      getPlanReflectionData(plan.id, userId, session.user),
      getRecentShareRecipients(userId, plan.id),
    ]);

  const periodSummaryHref = getPeriodSummaryHref("MONTH", plan.dateStart);

  return (
    <section className="space-y-6">
      <MonthPlanContent
        currentMonthStart={monthStart}
        headerAction={
          <Link
            href={periodSummaryHref}
            className="ui-text-link"
          >
            Month summary
          </Link>
        }
        plan={serializePlan(plan)}
        showCopyExport
        showPlatformShare
        platformShares={platformShares}
        recentShareRecipients={recentShareRecipients}
        itemView={planItemView}
        periodSummaryHref={periodSummaryHref}
        periodSummaryLabel="Month summary"
        observations={reflectionData.observations}
        gratitudes={reflectionData.gratitudes}
        therapyThoughts={undefined}
      />
    </section>
  );
}
