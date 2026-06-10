import type {
  FeedbackArea,
  FeedbackPriority,
  FeedbackStatus,
} from "@/app/generated/prisma/client";

const AREA_LABELS: Record<FeedbackArea, string> = {
  MOBILE: "Mobile",
  UI: "UI",
  TASKS: "Tasks",
  PLANS: "Plans",
  INSIGHTS: "Insights",
  SHARING: "Sharing",
  NOTIFICATIONS: "Notifications",
  SETTINGS: "Settings",
  ADMIN: "Admin",
  AI_IMPORT: "AI import",
  OTHER: "Other",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  OPEN: "Open",
  REVIEWED: "Reviewed",
  PLANNED: "Planned",
  DONE: "Done",
  WONT_DO: "Won't do",
};

const PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
};

export function getFeedbackAreaLabel(area: FeedbackArea): string {
  return AREA_LABELS[area];
}

export function getFeedbackStatusLabel(status: FeedbackStatus): string {
  return STATUS_LABELS[status];
}

export function getFeedbackPriorityLabel(priority: FeedbackPriority): string {
  return PRIORITY_LABELS[priority];
}
