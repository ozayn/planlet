import type { PlanItemStatus } from "@/app/generated/prisma/client";

export const UNFINISHED_TASK_STATUSES = [
  "OPEN",
  "PARTIAL",
  "MOVED",
  "SKIPPED",
] as const satisfies readonly PlanItemStatus[];

export const UNFINISHED_TASK_RECENT_DAYS = 30;

/** Max unfinished tasks returned for the unrestricted "All" range. */
export const UNFINISHED_TASK_ALL_RANGE_LIMIT = 100;

export type UnfinishedTaskRange =
  | "today"
  | "week"
  | "month"
  | "recent"
  | "all";

export const UNFINISHED_TASK_RANGE_OPTIONS: {
  value: UnfinishedTaskRange;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "recent", label: "All recent" },
  { value: "all", label: "All" },
];

export const UNFINISHED_TASK_STATUS_FILTERS: {
  value: "all" | (typeof UNFINISHED_TASK_STATUSES)[number];
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "PARTIAL", label: "Partial" },
  { value: "SKIPPED", label: "Skipped" },
  { value: "MOVED", label: "Moved" },
];

export const UNFINISHED_TASK_REFLECTION_REASONS = [
  "Too big",
  "Not important",
  "Avoidance",
  "Waiting on someone",
  "Low energy",
  "Unclear next step",
  "Time estimate wrong",
] as const;

export type UnfinishedTaskReflectionReason =
  (typeof UNFINISHED_TASK_REFLECTION_REASONS)[number];

export type SerializedUnfinishedTaskReflection = {
  id: string;
  reason: string | null;
  note: string | null;
  createdAt: string;
};

export type SerializedUnfinishedTask = {
  id: string;
  planId: string;
  title: string;
  status: PlanItemStatus;
  planDate: string;
  planDateLabel: string;
  themeId: string | null;
  themeName: string | null;
  projectId: string | null;
  projectName: string | null;
  assignmentLabel: string | null;
  parentTitle: string | null;
  isSubtask: boolean;
  subtaskCount: number;
  movableSubtaskCount: number;
  latestReflection: SerializedUnfinishedTaskReflection | null;
};

export type UnfinishedTaskAssignmentFilter = {
  value: string;
  label: string;
};

export type UnfinishedTasksPageData = {
  range: UnfinishedTaskRange;
  tasks: SerializedUnfinishedTask[];
  assignmentFilters: UnfinishedTaskAssignmentFilter[];
  /** True when the All range hit the query limit. */
  truncated?: boolean;
  limit?: number;
};
