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

  const allDone = subtaskStatuses.every((status) => status === "DONE");
  if (allDone) {
    return "DONE";
  }

  const hasDone = subtaskStatuses.some((status) => status === "DONE");
  const hasNotDone = subtaskStatuses.some((status) => status === "NOT_DONE");
  const allNotDone = subtaskStatuses.every((status) => status === "NOT_DONE");
  const hasPartial = subtaskStatuses.some((status) => status === "PARTIAL");

  if (hasDone && (hasNotDone || hasPartial)) {
    return "PARTIAL";
  }

  if (hasDone) {
    return "PARTIAL";
  }

  if (allNotDone) {
    return "NOT_DONE";
  }

  if (hasNotDone || hasPartial) {
    return "PARTIAL";
  }

  return currentParentStatus === "PARTIAL" ? "OPEN" : currentParentStatus;
}
