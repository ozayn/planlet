import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { formatDateRange } from "@/lib/dates";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";
import { getStatusIcon, getStatusLabel, STATUS_STYLES } from "@/lib/plan-status";
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
        className={`ui-plan-item group relative overflow-hidden px-3 py-2.5 ${STATUS_STYLES[item.status].card}`}
      >
        <span
          className={`absolute inset-y-2.5 start-0 w-0.5 rounded-full opacity-50 ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="flex items-start gap-2 ps-1.5">
          <span
            className={`mt-0.5 text-sm ${STATUS_STYLES[item.status].icon}`}
            title={getStatusLabel(item.status)}
            aria-label={getStatusLabel(item.status)}
          >
            {getStatusIcon(item.status)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-foreground" dir="auto">
              {item.title}
            </p>
            <p className="mt-0.5 text-[0.6875rem] text-muted-light">
              {getPlanItemTypeLabel(item.type)}
            </p>
          </div>
        </div>
      </div>
      {item.subtasks.length > 0 ? (
        <div className="mt-2 space-y-2">
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
              Shared with you · Read-only
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
          <div className="ui-empty-state">
            <p className="text-sm text-muted">This plan has no items yet.</p>
          </div>
        ) : (
          plan.items.map((item) => <ReadOnlyItem key={item.id} item={item} />)
        )}
      </section>
    </div>
  );
}
