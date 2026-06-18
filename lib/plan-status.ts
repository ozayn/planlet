import type { PlanItemStatus } from "@/app/generated/prisma/client";

/** Menu / breakdown order for plan item statuses. */
export const PLAN_ITEM_STATUS_ORDER: PlanItemStatus[] = [
  "OPEN",
  "DONE",
  "PARTIAL",
  "NOT_DONE",
  "MOVED",
  "SKIPPED",
  "RELEASED",
];

/** Expressive (CHECKLIST) view — prominent emoji status icons. */
export const EXPRESSIVE_STATUS_ICONS: Record<PlanItemStatus, string> = {
  OPEN: "☐",
  DONE: "✅",
  PARTIAL: "◐",
  NOT_DONE: "❌",
  MOVED: "↪️",
  SKIPPED: "⏭",
  RELEASED: "🕊",
};

const STATUS_ICONS = EXPRESSIVE_STATUS_ICONS;

const STATUS_LABELS: Record<PlanItemStatus, string> = {
  OPEN: "Open",
  DONE: "Done",
  PARTIAL: "Partial",
  NOT_DONE: "Not done",
  MOVED: "Moved",
  SKIPPED: "Skipped",
  RELEASED: "Released",
};

export const STATUS_DESCRIPTIONS: Record<PlanItemStatus, string> = {
  OPEN: "Not started yet",
  DONE: "Completed",
  PARTIAL: "Some progress",
  NOT_DONE: "Did not get done",
  MOVED: "Moved to another time",
  SKIPPED: "Intentionally skipped",
  RELEASED: "Let go",
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
  NOT_DONE: {
    accentBar: "bg-accent-red/25",
    card: "opacity-90",
    icon: "text-muted",
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
    case "NOT_DONE":
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

export function getStatusDescription(status: PlanItemStatus): string {
  return STATUS_DESCRIPTIONS[status];
}

export function getStatusIcon(status: PlanItemStatus): string {
  return STATUS_ICONS[status];
}

export function getStatusOptionLabel(status: PlanItemStatus): string {
  return `${getStatusIcon(status)} ${getStatusLabel(status)}`;
}

function simpleStatusMarker(status: PlanItemStatus): string | null {
  switch (status) {
    case "DONE":
      return "[x]";
    case "NOT_DONE":
      return "[not done]";
    case "PARTIAL":
      return "[partial]";
    case "MOVED":
      return "[moved]";
    case "SKIPPED":
      return "[skipped]";
    case "RELEASED":
      return "[released]";
    case "OPEN":
      return null;
    default:
      return null;
  }
}

/** Prefix for simple-text share lines, e.g. [not done]. */
export function getSimpleShareStatusMarker(
  status: PlanItemStatus,
): string | null {
  return simpleStatusMarker(status);
}
