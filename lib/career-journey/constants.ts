import type {
  CareerPracticeMode,
  CareerPracticeStatus,
  CareerPracticeType,
} from "@/app/generated/prisma/client";

export const DEFAULT_CAREER_TARGET_ROLES = [
  "ML Engineer",
  "Data Scientist",
  "Data Engineer",
] as const;

export const DEFAULT_CAREER_PILLARS = [
  { name: "Applications", weeklyTarget: 5, sortOrder: 0 },
  { name: "Networking", weeklyTarget: 2, sortOrder: 1 },
  { name: "Technical prep", weeklyTarget: 3, sortOrder: 2 },
  { name: "Learning", weeklyTarget: 3, sortOrder: 3 },
  { name: "Portfolio/projects", weeklyTarget: 2, sortOrder: 4 },
  { name: "Recovery/reflection", weeklyTarget: 2, sortOrder: 5 },
] as const;

export const CAREER_THEME_NAME = "Career";
export const JOB_HUNT_PROJECT_NAME = "Job Hunt";
export const EXPO_PRINT_PROJECT_NAME = "ExpoPrint Contract";

export const PRACTICE_TYPE_TO_PILLAR: Record<CareerPracticeType, string> = {
  APPLICATION: "Applications",
  NETWORKING: "Networking",
  LEETCODE: "Technical prep",
  ML_REVIEW: "Technical prep",
  SYSTEM_DESIGN: "Technical prep",
  COURSE: "Learning",
  PROJECT: "Portfolio/projects",
  RECOVERY: "Recovery/reflection",
};

export const PRACTICE_TYPE_LABELS: Record<CareerPracticeType, string> = {
  LEETCODE: "LeetCode",
  ML_REVIEW: "ML review",
  COURSE: "Course",
  SYSTEM_DESIGN: "System design",
  PROJECT: "Project",
  NETWORKING: "Networking",
  APPLICATION: "Application",
  RECOVERY: "Recovery",
};

export const PRACTICE_MODE_LABELS: Record<CareerPracticeMode, string> = {
  TINY: "Tiny step",
  WARMUP: "Warm-up",
  MODERATE: "Moderate",
  DEEP: "Deep focus",
};

export const PRACTICE_STATUS_LABELS: Record<CareerPracticeStatus, string> = {
  PLANNED: "Planned",
  DONE: "Done",
  SKIPPED: "Skipped",
  MOVED: "Moved",
};

export const GENTLE_DAILY_OPTIONS = [
  {
    id: "technical-warmup",
    label: "15-min technical warm-up",
    type: "LEETCODE" as const,
    mode: "WARMUP" as const,
    title: "15-min technical warm-up",
  },
  {
    id: "ml-concept",
    label: "Review one ML concept",
    type: "ML_REVIEW" as const,
    mode: "TINY" as const,
    title: "Review one ML concept",
  },
  {
    id: "networking-message",
    label: "Send one networking message",
    type: "NETWORKING" as const,
    mode: "TINY" as const,
    title: "Send one networking message",
  },
  {
    id: "save-job",
    label: "Save one job",
    type: "APPLICATION" as const,
    mode: "TINY" as const,
    title: "Save one job",
  },
  {
    id: "project-task",
    label: "Work on one project task",
    type: "PROJECT" as const,
    mode: "TINY" as const,
    title: "Work on one project task",
  },
  {
    id: "rest-recover",
    label: "Rest/recover intentionally",
    type: "RECOVERY" as const,
    mode: "TINY" as const,
    title: "Rest/recover intentionally",
  },
] as const;
