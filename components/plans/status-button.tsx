"use client";

import type { PlanItemStatus } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updatePlanItemStatusAction } from "@/app/(app)/plans/actions";
import {
  getStatusIcon,
  getStatusLabel,
  STATUS_STYLES,
} from "@/lib/plan-status";

const STATUSES: PlanItemStatus[] = [
  "OPEN",
  "DONE",
  "PARTIAL",
  "MOVED",
  "SKIPPED",
  "RELEASED",
];

type StatusButtonProps = {
  planId: string;
  itemId: string;
  status: PlanItemStatus;
  compact?: boolean;
};

export function StatusButton({
  planId,
  itemId,
  status,
  compact = false,
}: StatusButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      aria-label="Item status"
      className={`min-h-11 shrink-0 rounded-lg border border-border bg-surface text-sm text-foreground transition-colors hover:bg-accent-cream focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:opacity-50 ${STATUS_STYLES[status].icon} ${
        compact ? "min-w-11 px-1 text-center" : "min-w-28 px-2"
      }`}
      onChange={(event) => {
        startTransition(async () => {
          await updatePlanItemStatusAction({
            planId,
            itemId,
            status: event.target.value as PlanItemStatus,
          });
          router.refresh();
        });
      }}
    >
      {STATUSES.map((value) => (
        <option key={value} value={value}>
          {compact
            ? getStatusIcon(value)
            : `${getStatusIcon(value)} ${getStatusLabel(value)}`}
        </option>
      ))}
    </select>
  );
}
