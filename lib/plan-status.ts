import type { PlanItemStatus } from "@/app/generated/prisma/client";

/** Expressive (CHECKLIST) view — prominent emoji status icons. */
export const EXPRESSIVE_STATUS_ICONS: Record<PlanItemStatus, string> = {
  OPEN: "☐",
  DONE: "✅",
  PARTIAL: "◐",
  MOVED: "↪️",
  SKIPPED: "⏭",
  RELEASED: "🕊",
};

const STATUS_ICONS = EXPRESSIVE_STATUS_ICONS;

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
    card: "",
    icon: "text-muted",
  },
  DONE: {
    accentBar: "bg-accent-blue/35",
    card: "",
    icon: "text-accent-blue",
  },
  PARTIAL: {
    accentBar: "bg-accent-yellow/45",
    card: "",
    icon: "text-foreground",
  },
  MOVED: {
    accentBar: "bg-muted-light/40",
    card: "",
    icon: "text-muted",
  },
  SKIPPED: {
    accentBar: "bg-border-soft",
    card: "opacity-80",
    icon: "text-muted-light",
  },
  RELEASED: {
    accentBar: "bg-border-soft",
    card: "opacity-75",
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

export function getStatusOptionLabel(status: PlanItemStatus): string {
  return `${getStatusIcon(status)} ${getStatusLabel(status)}`;
}
