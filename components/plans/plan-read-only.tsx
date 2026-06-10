import type { KudosType, PlanItemView } from "@/app/generated/prisma/client";

import { PlanItemStatusIcon } from "@/components/plans/plan-item-status-icon";

import { SendKudosPanel } from "@/components/plans/send-kudos-panel";
import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { formatDateRange } from "@/lib/dates";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";
import { partitionPlanItems } from "@/lib/plan-item-sections";
import { getStatusIcon, getStatusLabel, STATUS_STYLES } from "@/lib/plan-status";
import type { SerializedPlan, SerializedPlanItem } from "@/lib/plan-serialize";

type ViewerKudos = {
  type: KudosType;
} | null;

type PlanReadOnlyProps = {
  plan: SerializedPlan;
  ownerLabel?: string | null;
  planId: string;
  viewerKudos?: ViewerKudos;
  itemView?: PlanItemView;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-light">
      {children}
    </h3>
  );
}

function ReadOnlyTaskItem({
  item,
  depth = 0,
  itemView = "MINIMAL",
}: {
  item: SerializedPlanItem;
  depth?: number;
  itemView?: PlanItemView;
}) {
  const isChecklist = itemView === "CHECKLIST";
  return (
    <article className={depth > 0 ? "ms-4 border-s border-border-soft ps-3" : ""}>
      <div
        className={`ui-plan-item group relative overflow-hidden px-3 py-2 ${STATUS_STYLES[item.status].card}`}
      >
        <span
          className={`absolute inset-y-2 start-0 w-0.5 rounded-full opacity-50 ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="flex items-center gap-2 ps-1.5">
          {isChecklist ? (
            <span
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface/80 ${STATUS_STYLES[item.status].icon}`}
              title={getStatusLabel(item.status)}
              aria-label={getStatusLabel(item.status)}
            >
              <PlanItemStatusIcon status={item.status} className="h-5 w-5" />
            </span>
          ) : (
            <span
              className={`text-sm ${STATUS_STYLES[item.status].icon}`}
              title={getStatusLabel(item.status)}
              aria-label={getStatusLabel(item.status)}
            >
              {getStatusIcon(item.status)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground" dir="auto">
              {item.title}
            </p>
            <p className="mt-0.5 text-[0.6875rem] text-muted-light">
              {getPlanItemTypeLabel(item.type)}
            </p>
          </div>
        </div>
      </div>
      {item.subtasks.length > 0 ? (
        <div className="mt-1.5 space-y-1.5">
          {item.subtasks.map((subtask) => (
            <ReadOnlyTaskItem
              key={subtask.id}
              item={subtask}
              depth={depth + 1}
              itemView={itemView}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ReadOnlyIntentionItem({ item }: { item: SerializedPlanItem }) {
  return (
    <article className="rounded-lg border border-dashed border-border-soft bg-accent-cream/25 px-3 py-2">
      <p className="text-sm font-medium text-foreground" dir="auto">
        <span className="me-1.5 text-muted" aria-hidden="true">
          ✨
        </span>
        {item.title}
      </p>
    </article>
  );
}

function ReadOnlyNoteItem({ item }: { item: SerializedPlanItem }) {
  return (
    <article className="rounded-lg border border-border-soft/80 bg-surface-muted/40 px-3 py-2">
      <p
        className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
        dir="auto"
      >
        <span className="me-1.5 text-muted-light" aria-hidden="true">
          •
        </span>
        {item.title}
      </p>
    </article>
  );
}

export function PlanReadOnly({
  plan,
  ownerLabel,
  planId,
  viewerKudos = null,
  itemView = "MINIMAL",
}: PlanReadOnlyProps) {
  const dateStart = new Date(plan.dateStart);
  const dateEnd = new Date(plan.dateEnd);
  const { tasks, intentions, notes } = partitionPlanItems(plan.items);

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

      <SendKudosPanel planId={planId} viewerKudos={viewerKudos} />

      <section className="space-y-5">
        {plan.items.length === 0 ? (
          <div className="ui-empty-state">
            <p className="text-sm text-muted">This plan has no items yet.</p>
          </div>
        ) : (
          <>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                <SectionLabel>Tasks</SectionLabel>
                <div className="space-y-1.5">
                  {tasks.map((item) => (
                    <ReadOnlyTaskItem
                      key={item.id}
                      item={item}
                      itemView={itemView}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {intentions.length > 0 ? (
              <div className="space-y-2">
                <SectionLabel>Intentions</SectionLabel>
                <div className="space-y-1.5">
                  {intentions.map((item) => (
                    <ReadOnlyIntentionItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ) : null}
            {notes.length > 0 ? (
              <div className="space-y-2">
                <SectionLabel>Notes & reflections</SectionLabel>
                <div className="space-y-1.5">
                  {notes.map((item) => (
                    <ReadOnlyNoteItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
