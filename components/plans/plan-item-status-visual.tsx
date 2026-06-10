import type { PlanItemStatus, PlanItemView } from "@/app/generated/prisma/client";

import { PlanItemStatusIcon } from "@/components/plans/plan-item-status-icon";
import { isExpressiveItemView } from "@/lib/plan-item-view";
import { getStatusIcon } from "@/lib/plan-status";

type PlanItemStatusVisualProps = {
  status: PlanItemStatus;
  itemView?: PlanItemView;
  className?: string;
};

export function PlanItemStatusVisual({
  status,
  itemView = "MINIMAL",
  className,
}: PlanItemStatusVisualProps) {
  if (isExpressiveItemView(itemView)) {
    return (
      <span className={className} aria-hidden="true">
        {getStatusIcon(status)}
      </span>
    );
  }

  return <PlanItemStatusIcon status={status} className={className} />;
}
