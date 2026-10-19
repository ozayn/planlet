import {
  UNCATEGORIZED_LIFE_AREA_ID,
  UNCATEGORIZED_LIFE_AREA_LABEL,
} from "@/lib/life-areas/constants";
import type { LifeAreaTaskGroup } from "@/lib/life-areas/types";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

export type PrimaryLifeAreaRef = {
  id: string;
  name: string;
  archived: boolean;
};

export type LifeAreaGroup<T> = {
  areaId: string;
  areaName: string;
  archived: boolean;
  items: T[];
};

function resolvePrimaryArea(item: SerializedPlanItem): PrimaryLifeAreaRef | null {
  const primary = item.lifeAreas.find((area) => area.isPrimary);
  if (primary) {
    return {
      id: primary.id,
      name: primary.name,
      archived: primary.archived,
    };
  }
  return null;
}

export type GroupByPrimaryLifeAreaOptions = {
  /**
   * When true, include every non-archived catalog area even with zero tasks.
   * Uncategorized is still omitted when empty. Archived areas are never listed.
   */
  includeEmptyAreas?: boolean;
};

/**
 * Group items by primary Life Area. Each item appears once.
 * Secondary associations never create additional rows.
 * Uncategorized appears only when it has tasks.
 */
export function groupByPrimaryLifeArea<T>(
  items: T[],
  resolvePrimary: (item: T) => PrimaryLifeAreaRef | null,
  areaOrder: Array<{ id: string; name: string; archivedAt?: string | null }>,
  options?: GroupByPrimaryLifeAreaOptions,
): LifeAreaGroup<T>[] {
  const activeAreas = areaOrder.filter((area) => !area.archivedAt);
  const orderIndex = new Map(activeAreas.map((area, index) => [area.id, index]));
  const buckets = new Map<string, LifeAreaGroup<T>>();

  if (options?.includeEmptyAreas) {
    for (const area of activeAreas) {
      buckets.set(area.id, {
        areaId: area.id,
        areaName: area.name,
        archived: false,
        items: [],
      });
    }
  }

  for (const item of items) {
    const primary = resolvePrimary(item);
    const key = primary?.id ?? UNCATEGORIZED_LIFE_AREA_ID;

    // Skip tasks whose only primary is an archived area when empty areas are
    // seeded from the active catalog — still show them under that archived name.
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    buckets.set(key, {
      areaId: key,
      areaName: primary?.name ?? UNCATEGORIZED_LIFE_AREA_LABEL,
      archived: primary?.archived ?? false,
      items: [item],
    });
  }

  return [...buckets.values()].sort((a, b) => {
    if (a.areaId === UNCATEGORIZED_LIFE_AREA_ID) {
      return 1;
    }
    if (b.areaId === UNCATEGORIZED_LIFE_AREA_ID) {
      return -1;
    }
    const ai = orderIndex.get(a.areaId) ?? Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.get(b.areaId) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) {
      return ai - bi;
    }
    return a.areaName.localeCompare(b.areaName);
  });
}

/**
 * Group root tasks by primary Life Area. Each task appears once.
 * Secondary associations never create additional rows.
 * Uncategorized appears only when needed.
 */
export function groupPlanItemsByPrimaryLifeArea(
  items: SerializedPlanItem[],
  areaOrder: Array<{ id: string; name: string; archivedAt: string | null }>,
  options?: GroupByPrimaryLifeAreaOptions,
): LifeAreaTaskGroup[] {
  return groupByPrimaryLifeArea(
    items,
    resolvePrimaryArea,
    areaOrder,
    options,
  );
}

/** Normalize primary + secondary ids: unique, primary not in secondary. */
export function normalizeLifeAreaSelection(input: {
  primaryLifeAreaId: string | null;
  secondaryLifeAreaIds: string[];
}): {
  primaryLifeAreaId: string | null;
  secondaryLifeAreaIds: string[];
} {
  const primary = input.primaryLifeAreaId?.trim() || null;
  const seen = new Set<string>();
  const secondary: string[] = [];

  for (const raw of input.secondaryLifeAreaIds) {
    const id = raw.trim();
    if (!id || id === primary || seen.has(id)) {
      continue;
    }
    seen.add(id);
    secondary.push(id);
  }

  return { primaryLifeAreaId: primary, secondaryLifeAreaIds: secondary };
}

/**
 * Change or clear primary while keeping secondary associations.
 * The new primary is removed from secondaries if present; the previous
 * primary is not auto-added as a secondary.
 */
export function nextSelectionAfterPrimaryChange(input: {
  currentPrimaryId: string | null | undefined;
  currentSecondaryIds: string[];
  nextPrimaryId: string | null;
}): {
  primaryLifeAreaId: string | null;
  secondaryLifeAreaIds: string[];
} {
  return normalizeLifeAreaSelection({
    primaryLifeAreaId: input.nextPrimaryId,
    secondaryLifeAreaIds: input.currentSecondaryIds,
  });
}
