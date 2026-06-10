import { auth } from "@/auth";
import { InsightsBreakdown } from "@/components/insights/insights-breakdown";
import { InsightsEmptyState } from "@/components/insights/insights-empty-state";
import { InsightsIntentions } from "@/components/insights/insights-intentions";
import { InsightsObservations } from "@/components/insights/insights-observations";
import { InsightsPeriodLinks } from "@/components/insights/insights-period-links";
import { InsightsStatGrid } from "@/components/insights/insights-stat-grid";
import { PriorityMatrix } from "@/components/insights/priority-matrix";
import { PageHeader } from "@/components/page-header";
import {
  formatDateString,
  formatWeekStartString,
} from "@/lib/dates";
import { getMonthlyInsights } from "@/lib/insights";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";
import { getStatusLabel } from "@/lib/plan-status";

function formatItemsHint(
  items: number,
  intentions: number,
  notes: number,
): string | undefined {
  if (intentions === 0 && notes === 0) {
    return undefined;
  }

  const parts = [`${items} item${items === 1 ? "" : "s"}`];

  if (intentions > 0) {
    parts.push(`${intentions} intention${intentions === 1 ? "" : "s"}`);
  }

  if (notes > 0) {
    parts.push(`${notes} note${notes === 1 ? "" : "s"}`);
  }

  return parts.join(" · ");
}

function formatDoneValue(done: number, partial: number): string {
  if (partial > 0) {
    return `${done} · ${partial} partial`;
  }

  return String(done);
}

function formatMovedValue(moved: number, skipped: number): string {
  if (skipped > 0) {
    return `${moved} · ${skipped} skipped`;
  }

  return String(moved);
}

export default async function InsightsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const insights = await getMonthlyInsights(userId);
  const isEmpty = insights.totals.plans === 0 && insights.totals.items === 0;
  const now = new Date();
  const summaryDate = formatDateString(now);
  const weekSummaryHref = `/plans/week/${formatWeekStartString(now)}/summary`;
  const monthSummaryHref = `/plans/month/${summaryDate}/summary`;
  const yearSummaryHref = `/plans/year/${summaryDate}/summary`;

  const repeatedIntentions = insights.intentions.filter(
    (intention) => intention.count > 1,
  );
  const singleIntentions = insights.intentions.filter(
    (intention) => intention.count === 1,
  );

  const typeRows = insights.byType.map((entry) => ({
    label: getPlanItemTypeLabel(entry.type),
    count: entry.count,
  }));

  const statusRows = insights.byStatus.map((entry) => ({
    label: getStatusLabel(entry.status),
    count: entry.count,
  }));

  const itemsHint = formatItemsHint(
    insights.totals.items,
    insights.totals.intentions,
    insights.totals.notes,
  );

  return (
    <section className="ui-insights-page space-y-5 sm:space-y-6">
      <PageHeader title="Insights" subtitle={insights.dateLabel} />

      <p className="-mt-3 text-sm text-muted-light">
        A quiet look at your plans this month.
      </p>

      {isEmpty ? (
        <InsightsEmptyState />
      ) : (
        <>
          <InsightsPeriodLinks
            weekHref={weekSummaryHref}
            monthHref={monthSummaryHref}
            yearHref={yearSummaryHref}
          />

          <InsightsStatGrid
            stats={[
              { label: "Plans", value: insights.totals.plans },
              {
                label: "Items",
                value: insights.totals.items,
                hint: itemsHint,
              },
              {
                label: "Done",
                value: formatDoneValue(
                  insights.totals.done,
                  insights.totals.partial,
                ),
              },
              {
                label: "Moved",
                value: formatMovedValue(
                  insights.totals.moved,
                  insights.totals.skipped,
                ),
              },
            ]}
          />

          <InsightsObservations
            count={insights.totals.observations}
            categories={insights.observationCategories}
          />

          <div className="ui-insights-main grid gap-5 lg:grid-cols-2 lg:gap-6">
            <InsightsBreakdown types={typeRows} statuses={statusRows} />

            <div className="space-y-5 sm:space-y-6">
              <InsightsIntentions
                repeated={repeatedIntentions}
                singles={singleIntentions}
              />

              {insights.oftenMovedTypes.length > 0 ? (
                <section className="ui-insights-section">
                  <h2 className="ui-insights-section-title">Often moved</h2>
                  <ul className="ui-insights-breakdown-list rounded-lg border border-border-soft/80 bg-surface/60 px-3 py-2.5">
                    {insights.oftenMovedTypes.map((entry) => (
                      <li
                        key={entry.type}
                        className="ui-insights-breakdown-row"
                      >
                        <span className="text-foreground">
                          {getPlanItemTypeLabel(entry.type)}
                        </span>
                        <span className="tabular-nums text-muted">
                          {entry.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <PriorityMatrix quadrants={insights.priorityQuadrants} />
            </div>
          </div>

          <p className="text-xs text-muted-light">
            These are observations, not grades.
          </p>
        </>
      )}
    </section>
  );
}
