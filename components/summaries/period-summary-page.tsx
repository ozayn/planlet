import Link from "next/link";
import { notFound } from "next/navigation";

import { PeriodSummaryView } from "@/components/summaries/period-summary-view";
import { WeekPlanNav } from "@/components/plans/week-plan-nav";
import { PageHeader } from "@/components/page-header";
import {
  formatWeekStartString,
  isValidDateString,
  parseDateString,
} from "@/lib/dates";
import { getPeriodSummary } from "@/lib/period-summary";
import {
  periodSummaryPageTitle,
  type PeriodSummaryType,
} from "@/lib/period-summary-types";

type PeriodSummaryPageProps = {
  type: PeriodSummaryType;
  dateString: string;
  userId: string;
};

function periodPlanLinkLabel(type: PeriodSummaryType): string {
  switch (type) {
    case "WEEK":
      return "Weekly plan";
    case "MONTH":
      return "Monthly plan";
    case "YEAR":
      return "Yearly plan";
  }
}

export async function PeriodSummaryPage({
  type,
  dateString,
  userId,
}: PeriodSummaryPageProps) {
  if (!isValidDateString(dateString)) {
    notFound();
  }

  const date = parseDateString(dateString);
  const summary = await getPeriodSummary(userId, type, date);
  const weekStart =
    type === "WEEK" ? formatWeekStartString(date) : summary.periodStart;

  return (
    <section className="space-y-6">
      <PageHeader
        title={periodSummaryPageTitle(type)}
        subtitle={summary.periodLabel}
        action={
          <Link href={summary.periodPlanHref} className="ui-text-link">
            {periodPlanLinkLabel(type)}
          </Link>
        }
      />

      {type === "WEEK" ? <WeekPlanNav currentWeekStart={weekStart} /> : null}

      <PeriodSummaryView summary={summary} />
    </section>
  );
}
