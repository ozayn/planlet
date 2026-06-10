"use client";

import Link from "next/link";

import type { PlanType } from "@/app/generated/prisma/client";
import { DeletePlanMenu } from "@/components/plans/delete-plan-menu";
import { FileTextIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS } from "@/lib/action-labels";
import {
  formatDateString,
  formatPlanCardDate,
  formatWeekStartString,
} from "@/lib/dates";
import { formatPlanActivityLabel } from "@/lib/plan-activity";
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
            {formatPlanCardDate({ type, dateStart, dateEnd })}
          </p>
          <p className="text-xs text-muted-light">
            {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
            {formatPlanActivityLabel(updatedAt)}
          </p>
        </div>
      </Link>
      <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-100 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {summaryHref ? (
          <Link
            href={summaryHref}
            onClick={(event) => event.stopPropagation()}
            aria-label={ACTION_LABELS.summary.ariaLabel}
            title={ACTION_LABELS.summary.title}
            className="ui-btn-ghost inline-flex min-h-8 items-center gap-1 px-2 text-xs"
          >
            <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span>{ACTION_LABELS.summary.title}</span>
          </Link>
        ) : null}
        <DeletePlanMenu planId={id} />
      </div>
    </li>
  );
}
