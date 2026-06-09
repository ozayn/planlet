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
      className={`min-h-11 shrink-0 rounded-lg border border-border bg-surface text-sm text-foreground transition-colors hover:bg-accent-cream focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:opacity-50 ${STATUS_STYLES[status].icon} ${
        compact
          ? "w-[4.5rem] truncate px-1 text-center sm:w-auto sm:min-w-28 sm:overflow-visible sm:px-2 sm:text-start"
          : "min-w-28 px-2"
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
