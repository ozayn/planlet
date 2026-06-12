import type { PlanItemStatus } from "@/app/generated/prisma/client";

const PRESERVED_PARENT_STATUSES = new Set<PlanItemStatus>([
  "MOVED",
  "SKIPPED",
  "RELEASED",
]);

function countsTowardProgress(status: PlanItemStatus): boolean {
  return status === "DONE" || status === "PARTIAL";
}

export function deriveParentStatusFromSubtasks(
  subtaskStatuses: readonly PlanItemStatus[],
  currentParentStatus: PlanItemStatus,
): PlanItemStatus {
  if (PRESERVED_PARENT_STATUSES.has(currentParentStatus)) {
    return currentParentStatus;
  }

  if (subtaskStatuses.length === 0) {
    return currentParentStatus;
  }

  if (subtaskStatuses.every((status) => status === "MOVED")) {
    return "MOVED";
  }

  const completedCount = subtaskStatuses.filter((status) => status === "DONE")
    .length;
  const progressCount = subtaskStatuses.filter(countsTowardProgress).length;

  if (completedCount === subtaskStatuses.length) {
    return "DONE";
  }

  if (progressCount > 0) {
    return "PARTIAL";
  }

  return currentParentStatus === "PARTIAL" ? "OPEN" : currentParentStatus;
}
