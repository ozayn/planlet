import type { PlanType } from "@/app/generated/prisma/client";

import { formatPlanCardDate } from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";

type PlanMetadataProps = {
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
  activityLabel: string;
  compact?: boolean;
};

export function PlanMetadata({
  type,
  dateStart,
  dateEnd,
  itemCount,
  activityLabel,
  compact = false,
}: PlanMetadataProps) {
  const typeLabel = getPlanTypeLabel(type);
  const dateLine = formatPlanCardDate({ type, dateStart, dateEnd });
  const statsParts = [
    itemCount > 0
      ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
      : null,
    activityLabel,
  ].filter(Boolean);
  const statsLine = statsParts.join(" · ");

  if (compact) {
    return statsLine ? (
      <p className="ui-plan-metadata text-xs text-muted">{statsLine}</p>
    ) : null;
  }

  return (
    <div className="ui-plan-metadata min-w-0 space-y-0.5">
      <p className="text-sm text-foreground">
        {type !== "DAY" ? (
          <span className="text-muted md:hidden">{typeLabel} · </span>
        ) : null}
        <span className="hidden text-muted md:inline">{typeLabel} · </span>
        <span>{dateLine}</span>
      </p>
      {statsLine ? (
        <p className="text-xs text-muted">{statsLine}</p>
      ) : null}
    </div>
  );
}
