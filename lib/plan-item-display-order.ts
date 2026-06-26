import type { SerializedPlanItem } from "@/lib/plan-serialize";

/** Default until a user setting is added in Settings → Planning. */
export const MOVE_COMPLETED_ITEMS_TO_TOP_DEFAULT = true;

export type PlanItemDisplayOrderOptions = {
  moveCompletedToTop?: boolean;
};

export function isPlanItemDone(item: SerializedPlanItem): boolean {
  return item.status === "DONE";
}

/**
 * Stable partition: completed items first, then everything else.
 * Preserves relative order within each group. Does not mutate sortOrder.
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

  return [...done, ...notDone];
}
