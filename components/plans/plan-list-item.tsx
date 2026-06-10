"use client";

import Link from "next/link";

import type { PlanType } from "@/app/generated/prisma/client";
import { PlanListMoreMenu } from "@/components/plans/plan-list-more-menu";
import {
  formatDateString,
  formatWeekStartString,
} from "@/lib/dates";
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

export function PlanListItem({
  id,
  title,
  type,
  dateStart,
  dateEnd,
  itemCount,
  updatedAt,
}: PlanListItemProps) {
  const href =
    type === "DAY"
      ? `/plans/day/${formatDateString(dateStart)}`
      : type === "WEEK"
        ? `/plans/week/${formatWeekStartString(dateStart)}`
        : `/plans/${id}`;

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
        className="ui-plan-list-row flex min-h-11 items-center gap-2 pe-11"
      >
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
