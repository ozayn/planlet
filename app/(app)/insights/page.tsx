import { auth } from "@/auth";
import { InsightsBreakdown } from "@/components/insights/insights-breakdown";
import { InsightsEmptyState } from "@/components/insights/insights-empty-state";
import { InsightsIntentions } from "@/components/insights/insights-intentions";
import { InsightsObservations } from "@/components/insights/insights-observations";
import { InsightsPeriodLinks } from "@/components/insights/insights-period-links";
import { InsightsProgress } from "@/components/insights/insights-progress";
import { InsightsSummaryLine } from "@/components/insights/insights-summary-line";
import { InsightsReflectionLens } from "@/components/insights/insights-reflection-lens";
import { InsightsTherapyThoughts } from "@/components/insights/insights-therapy-thoughts";
import { PriorityMatrix } from "@/components/insights/priority-matrix";
import { PageHeader } from "@/components/page-header";
import {
  formatDateString,
  formatWeekStartString,
} from "@/lib/dates";
import { getMonthlyInsights } from "@/lib/insights";
import { getReflectionInfluencePreferencesForUser } from "@/lib/reflection-influence-preferences";
import {
  canUseCoachingFeatures,
  canUseReflectionFeatures,
} from "@/lib/roles";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";
import { getStatusLabel } from "@/lib/plan-status";

export default async function InsightsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const insights = await getMonthlyInsights(userId, new Date(), session.user);
  const showReflection = canUseReflectionFeatures(session.user);
  const showCoaching = canUseCoachingFeatures(session.user);
  const reflectionPreferences = showCoaching
    ? await getReflectionInfluencePreferencesForUser(userId, session.user)
    : { primary: [], secondary: [] };
  const isEmpty = insights.totals.plans === 0 && insights.totals.items === 0;
  const now = new Date();
  const summaryDate = formatDateString(now);
  const weekSummaryHref = `/plans/week/${formatWeekStartString(now)}/summary`;
  const monthSummaryHref = `/plans/month/${summaryDate}/summary`;
  const yearSummaryHref = `/plans/year/${summaryDate}/summary`;

  const typeRows = insights.byType.map((entry) => ({
    label: getPlanItemTypeLabel(entry.type),
    count: entry.count,
  }));

  const statusRows = insights.byStatus.map((entry) => ({
    label: getStatusLabel(entry.status),
    count: entry.count,
  }));

  return (
    <section className="ui-insights-page space-y-6">
      <PageHeader title="Insights" />

      <header className="space-y-2">
        <p className="text-base font-medium text-foreground">
          {insights.dateLabel}
        </p>
        <p className="text-sm text-muted">A quiet look at the month.</p>
        <InsightsPeriodLinks
          weekHref={weekSummaryHref}
          monthHref={monthSummaryHref}
          yearHref={yearSummaryHref}
        />
      </header>

      {isEmpty ? (
        <InsightsEmptyState />
      ) : (
        <>
          <hr className="ui-insights-divider" />

          <section className="ui-insights-section space-y-4">
            <h2 className="ui-insights-heading">Reflection</h2>
            <InsightsSummaryLine totals={insights.totals} />
            <InsightsIntentions intentions={insights.intentions} />
          </section>

          {showReflection ? (
            <InsightsObservations
              count={insights.totals.observations}
              categories={insights.observationCategories}
              recent={insights.recentObservations}
            />
          ) : null}

          <InsightsProgress totals={insights.totals} />

          <InsightsBreakdown types={typeRows} statuses={statusRows} />

          <PriorityMatrix quadrants={insights.priorityQuadrants} />

          {insights.therapyThoughts ? (
            <InsightsTherapyThoughts
              therapyThoughts={insights.therapyThoughts}
            />
          ) : null}

          <p className="text-xs text-muted-light">
            These are observations, not grades.
          </p>
        </>
      )}

      {showCoaching ? (
        <>
          {!isEmpty ? <hr className="ui-insights-divider" /> : null}
          <InsightsReflectionLens preferences={reflectionPreferences} />
        </>
      ) : null}
    </section>
  );
}
