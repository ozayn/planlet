import type { PlanItemStatus } from "@/app/generated/prisma/client";

const STATUS_ICONS: Record<PlanItemStatus, string> = {
  OPEN: "☐",
  DONE: "✅",
  PARTIAL: "◐",
  MOVED: "↪️",
  SKIPPED: "⏭",
  RELEASED: "🕊",
};

const STATUS_LABELS: Record<PlanItemStatus, string> = {
  OPEN: "Open",
  DONE: "Done",
  PARTIAL: "Partial",
  MOVED: "Moved",
  SKIPPED: "Skipped",
  RELEASED: "Released",
};

export function normalizeProgressForStatus(
  status: PlanItemStatus,
  currentProgress = 0,
): number {
  switch (status) {
    case "DONE":
      return 100;
    case "OPEN":
      return 0;
    case "PARTIAL":
      if (currentProgress > 0 && currentProgress < 100) {
        return currentProgress;
      }
      return 50;
    case "MOVED":
    case "SKIPPED":
    case "RELEASED":
      return 0;
    default:
      return currentProgress;
  }
}

export function getStatusLabel(status: PlanItemStatus): string {
  return STATUS_LABELS[status];
}

export function getStatusIcon(status: PlanItemStatus): string {
  return STATUS_ICONS[status];
}
