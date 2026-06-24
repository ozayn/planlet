"use client";

import type { SerializedCareerSession } from "@/lib/career-journey/career-journey";
import { computeWeeklyBalance } from "@/lib/career-journey/weekly-balance";

type CareerWeeklyBalanceProps = {
  weekSessions: SerializedCareerSession[];
};

export function CareerWeeklyBalance({ weekSessions }: CareerWeeklyBalanceProps) {
  const items = computeWeeklyBalance(weekSessions);

  return (
    <section className="ui-card-padded space-y-4 border border-border-soft">
      <div>
        <h2 className="text-base font-medium text-foreground">
          This week&apos;s balance
        </h2>
        <p className="mt-1 text-sm text-muted">
          A gentle look across tracks — no grades, just presence.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">{item.name}</span>
              <span className="tabular-nums text-muted">
                {item.count} {item.count === 1 ? "session" : "sessions"}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-muted"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-accent/60 transition-all"
                style={{ width: `${Math.round(item.barRatio * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
