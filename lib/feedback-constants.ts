import type {
  FeedbackArea,
  FeedbackPriority,
  FeedbackStatus,
} from "@/app/generated/prisma/client";

export const MAX_FEEDBACK_TITLE_LENGTH = 120;
export const MAX_FEEDBACK_BODY_LENGTH = 4000;
export const MAX_FEEDBACK_PAGE_PATH_LENGTH = 200;
export const FEEDBACK_EMPTY_MESSAGE =
  "Add a title or feedback before submitting.";

export const FEEDBACK_AREAS: readonly FeedbackArea[] = [
  "MOBILE",
  "UI",
  "TASKS",
  "PLANS",
  "INSIGHTS",
  "SHARING",
  "NOTIFICATIONS",
  "SETTINGS",
  "ADMIN",
  "AI_IMPORT",
  "OTHER",
] as const;

export const FEEDBACK_STATUSES: readonly FeedbackStatus[] = [
  "OPEN",
  "REVIEWED",
  "PLANNED",
  "DONE",
  "WONT_DO",
] as const;

export const FEEDBACK_PRIORITIES: readonly FeedbackPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
] as const;
