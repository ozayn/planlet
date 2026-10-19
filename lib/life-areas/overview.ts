import {
  DEFAULT_LIFE_AREA_RENAME_MAP,
  shortLifeAreaLabel,
  UNCATEGORIZED_LIFE_AREA_ID,
} from "@/lib/life-areas/constants";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import { isTaskItemType } from "@/lib/plan-item-sections";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

export type DailyLifeAreaRow = {
  id: string;
  name: string;
  shortLabel: string;
  hasTasks: boolean;
  taskCount: number;
};

export type DailyLifeAreasSummary = {
  /** Short labels for areas with ≥1 primary task today, catalog order. */
  representedShortLabels: string[];
  representedCount: number;
  totalActiveAreas: number;
  rows: DailyLifeAreaRow[];
};

function primaryAreaId(item: SerializedPlanItem): string | null {
  return item.lifeAreas.find((area) => area.isPrimary)?.id ?? null;
}

/**
 * Compact daily overview: count each active Life Area that has at least one
 * root task with that area as primary. Secondaries never inflate counts.
 */
export function summarizeDailyLifeAreas(input: {
  items: SerializedPlanItem[];
  lifeAreas: SerializedLifeArea[];
}): DailyLifeAreasSummary {
  const activeAreas = input.lifeAreas.filter((area) => !area.archivedAt);
  const rootTasks = input.items.filter(
    (item) => !item.parentItemId && isTaskItemType(item.type),
  );

  const counts = new Map<string, number>();
  for (const task of rootTasks) {
    const areaId = primaryAreaId(task);
    if (!areaId || areaId === UNCATEGORIZED_LIFE_AREA_ID) {
      continue;
    }
    counts.set(areaId, (counts.get(areaId) ?? 0) + 1);
  }

  const rows: DailyLifeAreaRow[] = activeAreas.map((area) => {
    const taskCount = counts.get(area.id) ?? 0;
    return {
      id: area.id,
      name: area.name,
      shortLabel: shortLifeAreaLabel(area.name),
      hasTasks: taskCount > 0,
      taskCount,
    };
  });

  const represented = rows.filter((row) => row.hasTasks);

  return {
    representedShortLabels: represented.map((row) => row.shortLabel),
    representedCount: represented.length,
    totalActiveAreas: activeAreas.length,
    rows,
  };
}

/**
 * Decide which exact-name default renames can apply without creating
 * duplicate names or touching customized labels.
 */
export function planDefaultLifeAreaRenames(
  existingNames: string[],
): Array<{ from: string; to: string }> {
  const nameSet = new Set(
    existingNames.map((name) => name.trim().toLowerCase()),
  );
  const planned: Array<{ from: string; to: string }> = [];

  for (const [from, to] of Object.entries(DEFAULT_LIFE_AREA_RENAME_MAP)) {
    if (from === to) {
      continue;
    }
    if (!existingNames.includes(from)) {
      continue;
    }
    if (nameSet.has(to.trim().toLowerCase())) {
      continue;
    }
    planned.push({ from, to });
  }

  return planned;
}
