import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { formatDateRange } from "@/lib/dates";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";
import { getStatusIcon, STATUS_STYLES } from "@/lib/plan-status";
import type { SerializedPlan } from "@/lib/plan-serialize";

type PlanReadOnlyProps = {
  plan: SerializedPlan;
  ownerLabel?: string | null;
};

function ReadOnlyItem({
  item,
  depth = 0,
}: {
  item: SerializedPlan["items"][number];
  depth?: number;
}) {
  return (
    <article className={depth > 0 ? "ms-4 border-s border-border-soft ps-3" : ""}>
      <div
        className={`ui-card relative overflow-hidden p-4 ${STATUS_STYLES[item.status].card}`}
      >
        <span
          className={`absolute inset-y-4 start-0 w-1 rounded-full ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="space-y-2 ps-2">
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 text-base ${STATUS_STYLES[item.status].icon}`}
              aria-hidden="true"
            >
              {getStatusIcon(item.status)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground" dir="auto">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-muted">
                {getPlanItemTypeLabel(item.type)}
              </p>
            </div>
          </div>
          {item.comment ? (
            <p className="text-sm leading-relaxed text-muted" dir="auto">
              {item.comment}
            </p>
          ) : null}
        </div>
      </div>
      {item.subtasks.length > 0 ? (
        <div className="mt-3 space-y-3">
          {item.subtasks.map((subtask) => (
            <ReadOnlyItem key={subtask.id} item={subtask} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function PlanReadOnly({ plan, ownerLabel }: PlanReadOnlyProps) {
  const dateStart = new Date(plan.dateStart);
  const dateEnd = new Date(plan.dateEnd);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <span className="inline-flex rounded-full bg-accent-cream px-3 py-1 text-xs font-medium text-muted">
              Shared with you
            </span>
            <h2
              className="text-xl font-semibold tracking-tight text-foreground"
              dir="auto"
            >
              {plan.title}
            </h2>
            <p className="text-sm text-muted">
              {formatDateRange(dateStart, dateEnd)}
              {ownerLabel ? ` · From ${ownerLabel}` : ""}
            </p>
          </div>
          <SharePlanPanel plan={plan} />
        </div>
        {plan.summary ? (
          <p className="text-sm leading-relaxed text-muted" dir="auto">
            {plan.summary}
          </p>
        ) : null}
      </header>

      <section className="space-y-3">
        {plan.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-10 text-center text-sm text-muted">
            This plan has no items yet.
          </p>
        ) : (
          plan.items.map((item) => <ReadOnlyItem key={item.id} item={item} />)
        )}
      </section>
    </div>
  );
}
