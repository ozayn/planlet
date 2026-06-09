import type { PlanItemStatus } from "@/app/generated/prisma/client";

import { getStatusIcon, getStatusLabel } from "@/lib/plan-status";

type StatusDistributionProps = {
  title: string;
  items: Array<{ status: PlanItemStatus; count: number }>;
};

export function StatusDistribution({ title, items }: StatusDistributionProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium text-stone-800">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No items this month yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.status}
              className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-stone-100 px-3"
            >
              <span className="flex items-center gap-2 text-sm text-stone-700">
                <span aria-hidden="true">{getStatusIcon(item.status)}</span>
                {getStatusLabel(item.status)}
              </span>
              <span className="text-sm text-stone-400">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
