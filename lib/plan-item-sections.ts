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

export type PlanItemSectionGroup = "tasks" | "intentions" | "notes";

export type PlanItemReorderScope = {
  parentItemId: string | null;
  sectionGroup: PlanItemSectionGroup;
};

export function getSiblingItemsWhere(
  planId: string,
  scope: PlanItemReorderScope,
) {
  if (scope.parentItemId) {
    return {
      planId,
      parentItemId: scope.parentItemId,
    };
  }

  if (scope.sectionGroup === "intentions") {
    return {
      planId,
      parentItemId: null,
      type: "INTENTION" as const,
    };
  }

  if (scope.sectionGroup === "notes") {
    return {
      planId,
      parentItemId: null,
      type: "NOTE" as const,
    };
  }

  return {
    planId,
    parentItemId: null,
    type: { in: [...TASK_ITEM_TYPES] },
  };
}

export function getPlanItemSectionGroup(type: PlanItemType): PlanItemSectionGroup {
  if (isNoteItemType(type)) {
    return "notes";
  }
  if (isIntentionItemType(type)) {
    return "intentions";
  }
  return "tasks";
}
