import type { TaskOrganizationDisplay } from "@/app/generated/prisma/client";

export const TASK_ORGANIZATION_DISPLAY_MODES = [
  "MINIMAL",
  "ASSIGNED_ONLY",
  "ALWAYS",
] as const;

export type TaskOrganizationDisplayValue =
  (typeof TASK_ORGANIZATION_DISPLAY_MODES)[number];

export const TASK_ORGANIZATION_DISPLAY_OPTIONS = [
  {
    value: "MINIMAL" as const,
    label: "Minimal",
    description:
      "Hide theme and project labels in task rows. Assign in item details.",
  },
  {
    value: "ASSIGNED_ONLY" as const,
    label: "Show assigned only",
    description:
      "Show labels only when a task has a theme or project. Unassigned tasks stay clean.",
  },
  {
    value: "ALWAYS" as const,
    label: "Always show themes & projects",
    description:
      "Always show assignment controls in task rows for quick organizing.",
  },
] as const;

export const DEFAULT_TASK_ORGANIZATION_DISPLAY: TaskOrganizationDisplay =
  "ASSIGNED_ONLY";
