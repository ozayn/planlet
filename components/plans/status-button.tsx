"use client";

import type { PlanItemStatus } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updatePlanItemStatusAction } from "@/app/(app)/plans/actions";
import { getStatusIcon, getStatusLabel } from "@/lib/plan-status";

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
      className={`min-h-11 shrink-0 rounded-lg border border-stone-200 bg-white text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:opacity-50 ${
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
          {compact ? getStatusIcon(value) : `${getStatusIcon(value)} ${getStatusLabel(value)}`}
        </option>
      ))}
    </select>
  );
}
