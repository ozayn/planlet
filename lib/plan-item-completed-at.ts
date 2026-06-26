import type { PlanItemStatus } from "@/app/generated/prisma/client";

export function resolveCompletedAt(
  previousStatus: PlanItemStatus,
  nextStatus: PlanItemStatus,
  previousCompletedAt: Date | null | undefined,
  now: Date,
): Date | null {
  if (nextStatus === "DONE") {
    if (previousStatus !== "DONE") {
      return now;
    }

    return previousCompletedAt ?? now;
  }

  return null;
}
