import type { PlanItemView } from "@/app/generated/prisma/client";

import { PlanItemStatusVisual } from "@/components/plans/plan-item-status-visual";
import { STATUS_STYLES } from "@/lib/plan-status";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type PlanItemDragPreviewProps = {
  item: Pick<SerializedPlanItem, "title" | "status" | "subtasks">;
  itemView?: PlanItemView;
  width?: number;
};

export function PlanItemDragPreview({
  item,
  itemView = "MINIMAL",
  width,
}: PlanItemDragPreviewProps) {
  const subtaskCount = item.subtasks.length;
  const measuredWidth = width
    ? Math.min(width, 640)
    : undefined;

  return (
    <div
      className={`pointer-events-none overflow-hidden rounded-lg border border-border-soft bg-surface opacity-95 shadow-md ${STATUS_STYLES[item.status].card}`}
      style={{
        width: measuredWidth
          ? `${measuredWidth}px`
          : "min(640px, calc(100vw - 32px))",
        maxWidth: "min(640px, calc(100vw - 32px))",
      }}
    >
      <div className="relative flex items-center gap-2.5 px-3 py-2.5">
        <span
          className={`absolute inset-y-2 start-0 w-0.5 rounded-full opacity-60 ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className={`ms-1 shrink-0 ${STATUS_STYLES[item.status].icon}`}>
          <PlanItemStatusVisual
            status={item.status}
            itemView={itemView}
            className="h-4 w-4"
          />
        </div>
        <p
          dir="auto"
          className="min-w-0 flex-1 line-clamp-2 text-sm font-medium leading-snug text-foreground"
        >
          {item.title}
        </p>
        {subtaskCount > 0 ? (
          <span className="shrink-0 text-[0.6875rem] text-muted-light">
            {subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
