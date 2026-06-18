import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CreateYearPlanButton } from "@/components/plans/create-year-plan-button";
import { YearPlanContent } from "@/components/plans/year-plan-content";
import { YearPlanNav } from "@/components/plans/year-plan-nav";
import {
  formatYearStartString,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import {
  getPlanSharesForOwner,
  getRecentShareRecipients,
} from "@/lib/plan-sharing";
import { getPeriodSummaryHref } from "@/lib/period-summary-links";
import { getPlanReflectionData } from "@/lib/reflection-data";
import { buildYearPlanPageTitle } from "@/lib/year-plan-header";
import { getYearPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanItemViewForUser } from "@/lib/user-preferences";

type YearPlanPageProps = {
  params: Promise<{ date: string }>;
};

export default async function YearPlanPage({ params }: YearPlanPageProps) {
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
  const yearStart = formatYearStartString(date);
  const plan = await getYearPlan(userId, date);
  const yearLabel = buildYearPlanPageTitle(yearStart);

  if (!plan) {
    return (
      <section className="ui-page-stack space-y-6">
        <header className="ui-page-header mb-0">
          <h1
            className="text-[1.625rem] font-semibold tracking-tight text-foreground"
            dir="auto"
          >
            {yearLabel}
          </h1>
          <p className="mt-1 text-sm text-muted">No list for this year yet.</p>
        </header>

        <YearPlanNav currentYearStart={yearStart} />

        <div className="ui-empty-state space-y-4">
          <p className="text-sm text-muted">No yearly plan for this year yet.</p>
          <CreateYearPlanButton dateString={yearStart} />
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

  const periodSummaryHref = getPeriodSummaryHref("YEAR", plan.dateStart);

  return (
    <section className="space-y-6">
      <YearPlanContent
        currentYearStart={yearStart}
        headerAction={
          <Link href={periodSummaryHref} className="ui-text-link">
            Year summary
          </Link>
        }
        plan={serializePlan(plan)}
        showCopyExport
        showPlatformShare
        platformShares={platformShares}
        recentShareRecipients={recentShareRecipients}
        itemView={planItemView}
        periodSummaryHref={periodSummaryHref}
        periodSummaryLabel="Year summary"
        observations={reflectionData.observations}
        gratitudes={reflectionData.gratitudes}
        therapyThoughts={undefined}
      />
    </section>
  );
}
