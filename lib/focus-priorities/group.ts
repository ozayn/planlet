import type { SerializedFocusPriority } from "@/lib/focus-priorities/types";

export function groupFocusPrioritiesByLifeArea(
  priorities: SerializedFocusPriority[],
): Map<string, SerializedFocusPriority[]> {
  const groups = new Map<string, SerializedFocusPriority[]>();
  for (const priority of priorities) {
    if (priority.archivedAt) {
      continue;
    }
    const list = groups.get(priority.lifeAreaId) ?? [];
    list.push(priority);
    groups.set(priority.lifeAreaId, list);
  }
  return groups;
}
