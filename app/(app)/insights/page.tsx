import { auth } from "@/auth";
import { InsightsEmptyState } from "@/components/insights/insights-empty-state";
import { PriorityMatrix } from "@/components/insights/priority-matrix";
import { SimpleBarList } from "@/components/insights/simple-bar-list";
import { StatusDistribution } from "@/components/insights/status-distribution";
import { SummaryCard } from "@/components/insights/summary-card";
import { PageHeader } from "@/components/page-header";
import { getMonthlyInsights } from "@/lib/insights";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";

export default async function InsightsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const insights = await getMonthlyInsights(userId);
  const isEmpty = insights.totals.plans === 0 && insights.totals.items === 0;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Insights"
        subtitle="A quiet look at what your plans have been holding."
      />

      <p className="text-sm text-muted">{insights.dateLabel}</p>

      {isEmpty ? (
        <>
          <InsightsEmptyState />
          <p className="text-sm text-muted-light">
            These are observations, not grades.
          </p>
        </>
      ) : (
        <>
          <div>
            <h2 className="ui-label mb-4">What your plans contained</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Plans"
                value={insights.totals.plans}
                accent="red"
              />
              <SummaryCard
                label="Items"
                value={insights.totals.items}
                accent="blue"
              />
              <SummaryCard
                label="Done / partial"
                value={`${insights.totals.done} / ${insights.totals.partial}`}
                hint="What moved forward"
                accent="yellow"
              />
              <SummaryCard
                label="Moved / skipped"
                value={`${insights.totals.moved} / ${insights.totals.skipped}`}
                hint="What was often moved"
                accent="blue"
              />
            </div>
          </div>

          <SimpleBarList
            title="Item types"
            items={insights.byType.map((entry) => ({
              label: getPlanItemTypeLabel(entry.type),
              count: entry.count,
            }))}
            emptyMessage="No items this month yet."
            accent="blue"
          />

          <StatusDistribution
            title="Status distribution"
            items={insights.byStatus}
          />

          <PriorityMatrix quadrants={insights.priorityQuadrants} />

          <section className="ui-card-padded">
            <h2 className="text-sm font-semibold text-foreground">
              Themes appearing in your plans
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Repeated intentions this month.
            </p>

            {insights.intentions.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No repeated intentions yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {insights.intentions.map((intention) => (
                  <li
                    key={intention.title}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-accent-cream/40 px-3"
                  >
                    <span className="text-sm text-foreground" dir="auto">
                      {intention.title}
                    </span>
                    <span className="text-sm text-muted-light">
                      {intention.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {insights.oftenMovedTypes.length > 0 ? (
            <SimpleBarList
              title="What was often moved"
              items={insights.oftenMovedTypes.map((entry) => ({
                label: getPlanItemTypeLabel(entry.type),
                count: entry.count,
              }))}
              accent="yellow"
            />
          ) : null}

          <p className="text-sm text-muted-light">
            These are observations, not grades.
          </p>
        </>
      )}
    </section>
  );
}
