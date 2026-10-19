import {
  UNCATEGORIZED_LIFE_AREA_ID,
  UNCATEGORIZED_LIFE_AREA_LABEL,
} from "@/lib/life-areas/constants";
import type { LifeAreaTaskGroup } from "@/lib/life-areas/types";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

function resolvePrimaryArea(item: SerializedPlanItem): {
  id: string;
  name: string;
  archived: boolean;
} | null {
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

/**
 * Group root tasks by primary Life Area. Each task appears once.
 * Secondary associations never create additional rows.
 * Empty areas are omitted. Uncategorized appears only when needed.
 */
export function groupPlanItemsByPrimaryLifeArea(
  items: SerializedPlanItem[],
  areaOrder: Array<{ id: string; name: string; archivedAt: string | null }>,
): LifeAreaTaskGroup[] {
  const orderIndex = new Map(areaOrder.map((area, index) => [area.id, index]));
  const buckets = new Map<string, LifeAreaTaskGroup>();

  for (const item of items) {
    const primary = resolvePrimaryArea(item);
    const key = primary?.id ?? UNCATEGORIZED_LIFE_AREA_ID;
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

  const groups = [...buckets.values()].sort((a, b) => {
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

  return groups;
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
