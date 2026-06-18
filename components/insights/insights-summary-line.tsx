import type { MonthlyInsightsTotals } from "@/lib/insights";

type InsightsSummaryLineProps = {
  totals: MonthlyInsightsTotals;
};

function formatInsightsSummaryLine(totals: MonthlyInsightsTotals): string {
  const parts = [
    `${totals.plans} plan${totals.plans === 1 ? "" : "s"}`,
    `${totals.items} item${totals.items === 1 ? "" : "s"}`,
    `${totals.done} completed`,
    `${totals.partial} partial`,
  ];

  if (totals.notDone > 0) {
    parts.push(`${totals.notDone} not done`);
  }

  if (totals.released > 0) {
    parts.push(`${totals.released} released`);
  }

  if (totals.moved > 0) {
    parts.push(`${totals.moved} moved`);
  }

  if (totals.skipped > 0) {
    parts.push(`${totals.skipped} skipped`);
  }

  return parts.join(" · ");
}

export function InsightsSummaryLine({ totals }: InsightsSummaryLineProps) {
  return (
    <p className="text-sm text-muted">{formatInsightsSummaryLine(totals)}</p>
  );
}
