"use client";

import Link from "next/link";

import type { PlanType } from "@/app/generated/prisma/client";
import { DeletePlanMenu } from "@/components/plans/delete-plan-menu";
import {
  formatDateRange,
  formatDateString,
  formatWeekStartString,
} from "@/lib/dates";
import { getPeriodSummaryHref } from "@/lib/period-summary-links";

type PlanListItemProps = {
  id: string;
  title: string;
  type: PlanType;
  dateStart: Date;
  dateEnd: Date;
  itemCount: number;
};

export function PlanListItem({
  id,
  title,
  type,
  dateStart,
  dateEnd,
  itemCount,
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

  return (
    <li className="group relative">
      <Link
        href={href}
        className={`ui-card flex min-h-11 items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-accent-cream/40${
          summaryHref ? " pe-24" : " pe-11"
        }`}
      >
        <div className="min-w-0">
          <p
            className="truncate text-sm font-medium text-foreground"
            dir="auto"
          >
            {title}
          </p>
          <p className="text-xs text-muted">
            {formatDateRange(dateStart, dateEnd)}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-light">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
      </Link>
      <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-100 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {summaryHref ? (
          <Link
            href={summaryHref}
            onClick={(event) => event.stopPropagation()}
            className="ui-btn-ghost min-h-8 px-2 text-xs"
          >
            Summary
          </Link>
        ) : null}
        <DeletePlanMenu planId={id} />
      </div>
    </li>
  );
}
