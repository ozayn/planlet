"use client";

import Link from "next/link";

import type { PlanType } from "@/app/generated/prisma/client";
import { PlanListMoreMenu } from "@/components/plans/plan-list-more-menu";
import {
  formatDateString,
  formatMonthStartString,
  formatWeekStartString,
  formatYearStartString,
} from "@/lib/dates";
import { getPlanTypeBadgeLabel } from "@/lib/plan-labels";
import { formatPlanListMetaLine } from "@/lib/plan-list-meta";
import { getPeriodSummaryHref } from "@/lib/period-summary-links";

type PlanListItemProps = {
  id: string;
  title: string;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
  updatedAt: Date;
};

function getPlanHref(type: PlanType, dateStart: Date, id: string): string {
  const today = formatDateString(new Date());

  switch (type) {
    case "DAY": {
      const dateString = formatDateString(dateStart);
      return dateString === today ? "/today" : `/plans/day/${dateString}`;
    }
    case "WEEK":
      return `/plans/week/${formatWeekStartString(dateStart)}`;
    case "MONTH":
      return `/plans/month/${formatMonthStartString(dateStart)}`;
    case "YEAR":
      return `/plans/year/${formatYearStartString(dateStart)}`;
    default:
      return `/plans/${id}`;
  }
}

export function PlanListItem({
  id,
  title,
  type,
  dateStart,
  dateEnd,
  itemCount,
  updatedAt,
}: PlanListItemProps) {
  const href = getPlanHref(type, dateStart, id);

  const summaryHref =
    type === "WEEK" || type === "MONTH" || type === "YEAR"
      ? getPeriodSummaryHref(type, dateStart)
      : null;

  const metaLine = formatPlanListMetaLine({
    type,
    dateStart,
    dateEnd,
    itemCount,
    updatedAt,
  });

  return (
    <li className="group relative">
      <Link
        href={href}
        className="ui-plan-list-row flex min-h-11 items-center gap-2.5 pe-11"
      >
        <span className="ui-plan-type-badge shrink-0">
          {getPlanTypeBadgeLabel(type)}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium text-foreground"
            dir="auto"
          >
            {title}
          </p>
          <p className="truncate text-xs text-muted-light">{metaLine}</p>
        </div>
      </Link>
      <div
        className="absolute end-0 top-1/2 -translate-y-1/2 opacity-100 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <PlanListMoreMenu
          planId={id}
          openHref={href}
          summaryHref={summaryHref}
        />
      </div>
    </li>
  );
}
