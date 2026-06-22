import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CreateWeekPlanButton } from "@/components/plans/create-week-plan-button";
import { WeekPlanContent } from "@/components/plans/week-plan-content";
import { WeekPlanNav } from "@/components/plans/week-plan-nav";
import {
  formatWeekStartString,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import {
  getPlanSharesForOwner,
  getRecentShareRecipients,
} from "@/lib/plan-sharing";
import { getPeriodSummaryHref } from "@/lib/period-summary-links";
import { getPlanReflectionData } from "@/lib/reflection-data";
import { buildWeekPlanPageTitle } from "@/lib/week-plan-header";
import { getWeekPlan } from "@/lib/plans";
import { serializePlan } from "@/lib/plan-serialize";
import { getPlanningPreferencesForUser } from "@/lib/user-preferences";
import { getThemeProjectCatalog } from "@/lib/themes-projects";

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
  const plan = await getWeekPlan(userId, date);
  const weekLabel = buildWeekPlanPageTitle(weekStart);

  if (!plan) {
    return (
      <section className="ui-page-stack space-y-6">
        <header className="ui-page-header mb-0">
          <h1
            className="text-[1.625rem] font-semibold tracking-tight text-foreground"
            dir="auto"
          >
            {weekLabel}
          </h1>
          <p className="mt-1 text-sm text-muted">No list for this week yet.</p>
        </header>

        <WeekPlanNav currentWeekStart={weekStart} />

        <div className="ui-empty-state space-y-4">
          <p className="text-sm text-muted">No weekly plan for this week yet.</p>
          <CreateWeekPlanButton dateString={weekStart} />
        </div>
      </section>
    );
  }

  const [platformShares, planningPreferences, reflectionData, recentShareRecipients, themeProjectCatalog] =
    await Promise.all([
      getPlanSharesForOwner(plan.id, userId),
      getPlanningPreferencesForUser(userId),
      getPlanReflectionData(plan.id, userId, session.user),
      getRecentShareRecipients(userId, plan.id),
      getThemeProjectCatalog(userId),
    ]);

  const periodSummaryHref = getPeriodSummaryHref("WEEK", plan.dateStart);

  return (
    <section className="space-y-6">
      <WeekPlanContent
        currentWeekStart={weekStart}
        headerAction={
          <Link href={periodSummaryHref} className="ui-text-link">
            Week summary
          </Link>
        }
        plan={serializePlan(plan)}
        showCopyExport
        showPlatformShare
        platformShares={platformShares}
        recentShareRecipients={recentShareRecipients}
        itemView={planningPreferences.planItemView}
        periodSummaryHref={periodSummaryHref}
        periodSummaryLabel="Week summary"
        observations={reflectionData.observations}
        gratitudes={reflectionData.gratitudes}
        therapyThoughts={undefined}
        themeProjectCatalog={themeProjectCatalog}
        taskOrganizationDisplay={planningPreferences.taskOrganizationDisplay}
      />
    </section>
  );
}
