"use client";

import type { PlanItemStatus } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updatePlanItemStatusAction } from "@/app/(app)/plans/actions";
import {
  getStatusLabel,
  getStatusOptionLabel,
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
  const currentLabel = getStatusLabel(status);

  return (
    <select
      value={status}
      disabled={isPending}
      aria-label={`Item status, ${currentLabel}`}
      title={currentLabel}
      className={`shrink-0 rounded-full border border-border-soft bg-surface/80 text-foreground transition-colors hover:border-border hover:bg-accent-cream focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-subtle)] disabled:opacity-50 ${STATUS_STYLES[status].icon} ${
        compact
          ? "min-h-9 max-w-[5.5rem] px-2 py-1 text-xs sm:max-w-none sm:min-w-[6.75rem] sm:px-2.5 sm:text-[0.8125rem]"
          : "min-h-10 min-w-28 px-2.5 text-sm"
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
        <option key={value} value={value} title={getStatusLabel(value)}>
          {getStatusOptionLabel(value)}
        </option>
      ))}
    </select>
  );
}
