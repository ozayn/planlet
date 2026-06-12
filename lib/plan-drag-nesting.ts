import {
  isTaskItemType,
  type PlanItemSectionGroup,
} from "@/lib/plan-item-sections";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

/** Horizontal drag distance required before a drop nests or promotes (desktop). */
export const NESTING_THRESHOLD_PX = 36;

/** Left drag distance (negative) required before a subtask is promoted to root. */
export const PROMOTION_THRESHOLD_PX = -NESTING_THRESHOLD_PX;

export function isNestingDragOffset(dragOffsetX: number): boolean {
  return dragOffsetX >= NESTING_THRESHOLD_PX;
}

export function isPromotionDragOffset(dragOffsetX: number): boolean {
  return dragOffsetX <= PROMOTION_THRESHOLD_PX;
}

export function collectDescendantIds(item: SerializedPlanItem): Set<string> {
  const ids = new Set<string>();

  function walk(node: SerializedPlanItem) {
    for (const subtask of node.subtasks) {
      ids.add(subtask.id);
      walk(subtask);
    }
  }

  walk(item);
  return ids;
}

export function canNestTaskUnder(
  draggedId: string,
  targetId: string,
  rootTasks: SerializedPlanItem[],
): boolean {
  if (draggedId === targetId) {
    return false;
  }

  const dragged = rootTasks.find((item) => item.id === draggedId);
  const target = rootTasks.find((item) => item.id === targetId);

  if (!dragged || !target) {
    return false;
  }

  if (dragged.parentItemId || target.parentItemId) {
    return false;
  }

  if (!isTaskItemType(dragged.type) || !isTaskItemType(target.type)) {
    return false;
  }

  return !collectDescendantIds(dragged).has(targetId);
}

export function getNestableParentCandidates(
  itemId: string,
  rootTasks: SerializedPlanItem[],
): SerializedPlanItem[] {
  const dragged = rootTasks.find((item) => item.id === itemId);

  if (!dragged || dragged.parentItemId || !isTaskItemType(dragged.type)) {
    return [];
  }

  const descendants = collectDescendantIds(dragged);

  return rootTasks.filter(
    (item) =>
      item.id !== itemId &&
      !item.parentItemId &&
      isTaskItemType(item.type) &&
      !descendants.has(item.id),
  );
}

export function isDragNestingEnabled(
  canEdit: boolean,
  sectionGroup: PlanItemSectionGroup,
  parentItemId: string | null | undefined,
  desktopDragEnabled: boolean,
): boolean {
  return (
    canEdit &&
    desktopDragEnabled &&
    sectionGroup === "tasks" &&
    (parentItemId ?? null) === null
  );
}

export function isDragPromotionEnabled(
  canEdit: boolean,
  sectionGroup: PlanItemSectionGroup,
  parentItemId: string | null | undefined,
  desktopDragEnabled: boolean,
): boolean {
  return (
    canEdit &&
    desktopDragEnabled &&
    sectionGroup === "tasks" &&
    (parentItemId ?? null) !== null
  );
}
