import type { KudosType } from "@/app/generated/prisma/client";

import { formatUserLabel, getKudosTypeLabel } from "@/lib/kudos-labels";

export type PlanKudosEntry = {
  id: string;
  type: KudosType;
  sender: {
    name: string | null;
    email: string | null;
  };
};

type PlanKudosSummaryProps = {
  kudos: PlanKudosEntry[];
};

export function PlanKudosSummary({ kudos }: PlanKudosSummaryProps) {
  if (kudos.length === 0) {
    return null;
  }

  const countLabel =
    kudos.length === 1
      ? "Kudos from 1 person"
      : `Kudos from ${kudos.length} people`;

  return (
    <details className="rounded-xl border border-border-soft bg-surface-muted/25">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm text-muted marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <KudosSparkIcon className="h-3.5 w-3.5 text-muted-light" />
          {countLabel}
        </span>
      </summary>
      <ul className="space-y-1.5 border-t border-border-soft px-3 py-2.5">
        {kudos.map((entry) => (
          <li key={entry.id} className="text-sm text-muted">
            <span className="font-medium text-foreground">
              {formatUserLabel(entry.sender)}
            </span>
            <span aria-hidden="true"> · </span>
            <span>{getKudosTypeLabel(entry.type)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function KudosSparkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="m12 3 1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z" />
      <path d="M5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17z" />
    </svg>
  );
}
