import type { PlanItemStatus } from "@/app/generated/prisma/client";

import {
  getStatusIcon,
  getStatusLabel,
  STATUS_STYLES,
} from "@/lib/plan-status";

type StatusDistributionProps = {
  title: string;
  items: Array<{ status: PlanItemStatus; count: number }>;
};

export function StatusDistribution({ title, items }: StatusDistributionProps) {
  return (
    <section className="ui-card-padded">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No items this month yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.status}
              className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-accent-cream/40 px-3"
            >
              <span
                className={`flex items-center gap-2 text-sm ${STATUS_STYLES[item.status].icon}`}
              >
                <span aria-hidden="true">{getStatusIcon(item.status)}</span>
                {getStatusLabel(item.status)}
              </span>
              <span className="text-sm text-muted-light">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
