import type { PlanItemType } from "@/app/generated/prisma/client";

import type { SerializedPlanItem } from "@/lib/plan-serialize";

export const TASK_ITEM_TYPES: readonly PlanItemType[] = [
  "TASK",
  "EVENT",
  "WORK_BLOCK",
  "ERRAND",
  "SOCIAL",
  "REST",
] as const;

export function isTaskItemType(type: PlanItemType): boolean {
  return (TASK_ITEM_TYPES as readonly string[]).includes(type);
}

export function isNoteItemType(type: PlanItemType): boolean {
  return type === "NOTE";
}

export function isIntentionItemType(type: PlanItemType): boolean {
  return type === "INTENTION";
}

/** Items that participate in completion/status metrics. */
export function isActionableItemType(type: PlanItemType): boolean {
  return isTaskItemType(type);
}

function sortRootItems(items: SerializedPlanItem[]): SerializedPlanItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function partitionPlanItems(items: SerializedPlanItem[]) {
  const tasks: SerializedPlanItem[] = [];
  const intentions: SerializedPlanItem[] = [];
  const notes: SerializedPlanItem[] = [];

  for (const item of sortRootItems(items)) {
    if (isNoteItemType(item.type)) {
      notes.push(item);
    } else if (isIntentionItemType(item.type)) {
      intentions.push(item);
    } else {
      tasks.push(item);
    }
  }

  return { tasks, intentions, notes };
}

export type AddItemKind = "TASK" | "INTENTION" | "NOTE";

export function addItemKindToType(kind: AddItemKind): PlanItemType {
  return kind;
}
