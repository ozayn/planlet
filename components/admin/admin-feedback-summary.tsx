import Link from "next/link";

type AdminFeedbackSummaryProps = {
  openCount: number;
  highPriorityCount: number;
};

export function AdminFeedbackSummary({
  openCount,
  highPriorityCount,
}: AdminFeedbackSummaryProps) {
  const hasFeedback = openCount > 0 || highPriorityCount > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div>
        <p className="font-medium text-foreground">Feedback</p>
        {hasFeedback ? (
          <p className="text-xs text-muted">
            {openCount} open · {highPriorityCount} high priority
          </p>
        ) : (
          <p className="text-xs text-muted">No feedback yet</p>
        )}
      </div>
      <Link
        href="/admin/feedback"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        Open feedback →
      </Link>
    </div>
  );
}
