import type {
  ObservationCategory,
  PlanItemStatus,
  PlanItemType,
  PriorityLevel,
} from "@/app/generated/prisma/client";

import { APP_TIMEZONE } from "@/config/time";
import { getMonthRange } from "@/lib/dates";
import { isActionableItemType } from "@/lib/plan-item-sections";
import { OBSERVATION_CATEGORIES } from "@/lib/observation-constants";
import { getObservationCategoryLabel } from "@/lib/observation-labels";
import type { UserAccess } from "@/lib/roles";
import { canUseReflectionFeatures } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export type MonthlyInsightsTotals = {
  plans: number;
  items: number;
  actionableItems: number;
  notes: number;
  intentions: number;
  done: number;
  partial: number;
  moved: number;
  skipped: number;
  released: number;
  open: number;
  observations: number;
};

export type MonthlyInsights = {
  dateLabel: string;
  totals: MonthlyInsightsTotals;
  byType: Array<{ type: PlanItemType; count: number }>;
  byStatus: Array<{ status: PlanItemStatus; count: number }>;
  priorityQuadrants: {
    doSoon: number;
    protectTime: number;
    contain: number;
    maybeRelease: number;
    unclassified: number;
  };
  intentions: Array<{ title: string; count: number }>;
  oftenMovedTypes: Array<{ type: PlanItemType; count: number }>;
  observationCategories: Array<{ category: ObservationCategory; label: string; count: number }>;
};

const STATUS_ORDER: PlanItemStatus[] = [
  "OPEN",
  "DONE",
  "PARTIAL",
  "MOVED",
  "SKIPPED",
  "RELEASED",
];

const TYPE_ORDER: PlanItemType[] = [
  "TASK",
  "INTENTION",
  "EVENT",
  "NOTE",
  "WORK_BLOCK",
  "ERRAND",
  "SOCIAL",
  "REST",
];

function isHigh(level: PriorityLevel | null | undefined): boolean {
  return level === "HIGH";
}

function isLowOrMedium(level: PriorityLevel | null | undefined): boolean {
  return level === "LOW" || level === "MEDIUM";
}

/**
 * Simple Eisenhower-style buckets for reflection (not scoring).
 *
 * - Do soon: importance HIGH + urgency HIGH
 * - Protect time: importance HIGH + urgency LOW/MEDIUM/null
 * - Contain: importance LOW/MEDIUM/null + urgency HIGH
 * - Maybe release: both set to LOW or MEDIUM (neither HIGH)
 * - Unclassified: both importance and urgency are null
 */
export function classifyPriorityQuadrant(item: {
  importance: PriorityLevel | null;
  urgency: PriorityLevel | null;
}): keyof MonthlyInsights["priorityQuadrants"] {
  const { importance, urgency } = item;

  if (isHigh(importance) && isHigh(urgency)) {
    return "doSoon";
  }

  if (isHigh(importance)) {
    return "protectTime";
  }

  if (isHigh(urgency)) {
    return "contain";
  }

  if (isLowOrMedium(importance) || isLowOrMedium(urgency)) {
    return "maybeRelease";
  }

  return "unclassified";
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  }).format(date);
}

function incrementMap<K extends string>(
  map: Map<K, number>,
  key: K,
  amount = 1,
) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortedEntries<K extends string>(
  map: Map<K, number>,
  order: readonly K[],
): Array<{ key: K; count: number }> {
  return order
    .map((key) => ({ key, count: map.get(key) ?? 0 }))
    .filter((entry) => entry.count > 0);
}

export async function getMonthlyInsights(
  userId: string,
  date = new Date(),
  access?: UserAccess,
): Promise<MonthlyInsights> {
  const { start, end } = getMonthRange(date);
  const canReflect = canUseReflectionFeatures(access ?? {});

  const [plans, observations] = await Promise.all([
    prisma.plan.findMany({
      where: {
        userId,
        dateStart: { lte: end },
        dateEnd: { gte: start },
      },
      include: {
        items: true,
      },
    }),
    canReflect
      ? prisma.planObservation.findMany({
          where: {
            userId,
            createdAt: { gte: start, lte: end },
          },
          select: { category: true },
        })
      : Promise.resolve([]),
  ]);

  const items = plans.flatMap((plan) => plan.items);
  const observationCategoryCounts = new Map<ObservationCategory, number>();

  for (const observation of observations) {
    incrementMap(observationCategoryCounts, observation.category);
  }

  const statusCounts = new Map<PlanItemStatus, number>();
  const typeCounts = new Map<PlanItemType, number>();
  const movedTypeCounts = new Map<PlanItemType, number>();
  const intentionTitleCounts = new Map<string, number>();
  let actionableItems = 0;
  let noteCount = 0;
  let intentionCount = 0;

  const priorityQuadrants = {
    doSoon: 0,
    protectTime: 0,
    contain: 0,
    maybeRelease: 0,
    unclassified: 0,
  };

  for (const item of items) {
    incrementMap(typeCounts, item.type);

    if (item.type === "NOTE") {
      noteCount += 1;
      continue;
    }

    if (item.type === "INTENTION") {
      intentionCount += 1;
      const title = item.title.trim();
      if (title) {
        incrementMap(intentionTitleCounts, title);
      }
      continue;
    }

    if (!isActionableItemType(item.type)) {
      continue;
    }

    actionableItems += 1;
    incrementMap(statusCounts, item.status);

    if (item.status === "MOVED") {
      incrementMap(movedTypeCounts, item.type);
    }

    const quadrant = classifyPriorityQuadrant(item);
    priorityQuadrants[quadrant] += 1;
  }

  const intentions = [...intentionTitleCounts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 8);

  const oftenMovedTypes = [...movedTypeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const observationCategories = OBSERVATION_CATEGORIES.flatMap((category) => {
    const count = observationCategoryCounts.get(category) ?? 0;
    if (count === 0) {
      return [];
    }

    return [
      {
        category,
        label: getObservationCategoryLabel(category),
        count,
      },
    ];
  });

  return {
    dateLabel: formatMonthLabel(date),
    totals: {
      plans: plans.length,
      items: items.length,
      actionableItems,
      notes: noteCount,
      intentions: intentionCount,
      done: statusCounts.get("DONE") ?? 0,
      partial: statusCounts.get("PARTIAL") ?? 0,
      moved: statusCounts.get("MOVED") ?? 0,
      skipped: statusCounts.get("SKIPPED") ?? 0,
      released: statusCounts.get("RELEASED") ?? 0,
      open: statusCounts.get("OPEN") ?? 0,
      observations: observations.length,
    },
    byType: sortedEntries(typeCounts, TYPE_ORDER).map(({ key, count }) => ({
      type: key,
      count,
    })),
    byStatus: sortedEntries(statusCounts, STATUS_ORDER).map(
      ({ key, count }) => ({
        status: key,
        count,
      }),
    ),
    priorityQuadrants,
    intentions,
    oftenMovedTypes,
    observationCategories,
  };
}
