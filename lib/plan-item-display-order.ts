import type { SerializedPlanItem } from "@/lib/plan-serialize";

/** Default until a user setting is added in Settings → Planning. */
export const MOVE_COMPLETED_ITEMS_TO_TOP_DEFAULT = true;

export type PlanItemDisplayOrderOptions = {
  moveCompletedToTop?: boolean;
};

export function isPlanItemDone(item: SerializedPlanItem): boolean {
  return item.status === "DONE";
}

function compareDoneItems(a: SerializedPlanItem, b: SerializedPlanItem): number {
  const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
  const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;

  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return a.sortOrder - b.sortOrder;
}

/**
 * Completed items first (oldest completion first), then open items in sortOrder.
 * Does not mutate sortOrder.
 */
export function orderPlanItemsForDisplay(
  items: SerializedPlanItem[],
  options: PlanItemDisplayOrderOptions = {},
): SerializedPlanItem[] {
  const moveCompletedToTop =
    options.moveCompletedToTop ?? MOVE_COMPLETED_ITEMS_TO_TOP_DEFAULT;

  if (!moveCompletedToTop) {
    return items;
  }

  const done: SerializedPlanItem[] = [];
  const notDone: SerializedPlanItem[] = [];

  for (const item of items) {
    if (isPlanItemDone(item)) {
      done.push(item);
    } else {
      notDone.push(item);
    }
  }

  done.sort(compareDoneItems);

  return [...done, ...notDone];
}
