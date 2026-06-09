import type { PlanItemStatus } from "@/app/generated/prisma/client";

const STATUS_ICONS: Record<PlanItemStatus, string> = {
  OPEN: "○",
  DONE: "●",
  PARTIAL: "◐",
  MOVED: "→",
  SKIPPED: "—",
  RELEASED: "·",
};

const STATUS_LABELS: Record<PlanItemStatus, string> = {
  OPEN: "Open",
  DONE: "Done",
  PARTIAL: "Partial",
  MOVED: "Moved",
  SKIPPED: "Skipped",
  RELEASED: "Released",
};

export const STATUS_STYLES: Record<
  PlanItemStatus,
  { accentBar: string; card: string; icon: string }
> = {
  OPEN: {
    accentBar: "bg-border",
    card: "bg-surface",
    icon: "text-muted",
  },
  DONE: {
    accentBar: "bg-accent-blue",
    card: "bg-surface",
    icon: "text-accent-blue",
  },
  PARTIAL: {
    accentBar: "bg-accent-yellow",
    card: "bg-surface",
    icon: "text-foreground",
  },
  MOVED: {
    accentBar: "bg-muted-light",
    card: "bg-background",
    icon: "text-muted",
  },
  SKIPPED: {
    accentBar: "bg-border-soft",
    card: "bg-background opacity-90",
    icon: "text-muted-light",
  },
  RELEASED: {
    accentBar: "bg-border-soft",
    card: "bg-surface/80",
    icon: "text-muted-light",
  },
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
