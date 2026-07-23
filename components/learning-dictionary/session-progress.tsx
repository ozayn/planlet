"use client";

type SessionProgressProps = {
  current: number;
  total: number;
};

export function SessionProgress({ current, total }: SessionProgressProps) {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(current, 0), safeTotal);
  const ratio = clamped / safeTotal;

  return (
    <div className="space-y-1.5" data-dictionary-session-progress="">
      <p className="text-sm text-muted">
        <span className="tabular-nums text-foreground">
          {clamped} of {safeTotal}
        </span>
      </p>
      <div
        className="h-1 overflow-hidden rounded-full bg-border/60"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={clamped}
        aria-label="Session progress"
      >
        <div
          className="h-full rounded-full bg-foreground/70 transition-[width] duration-200"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
