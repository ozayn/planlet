import type {
  ObservationCategory,
  PlanItemStatus,
  PlanItemType,
} from "@/app/generated/prisma/client";

import { APP_TIMEZONE } from "@/config/time";
import { getMonthRange } from "@/lib/dates";
import { isActionableItemType } from "@/lib/plan-item-sections";
import { OBSERVATION_CATEGORIES } from "@/lib/observation-constants";
import { getObservationCategoryLabel } from "@/lib/observation-labels";
import type { UserAccess } from "@/lib/roles";
import {
  canUseReflectionFeatures,
  canUseTherapyThoughts,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { classifyPriorityQuadrant } from "@/lib/item-priority";
import { PLAN_ITEM_STATUS_ORDER } from "@/lib/plan-status";

export type MonthlyInsightsTotals = {
  plans: number;
  items: number;
  actionableItems: number;
  notes: number;
  intentions: number;
  done: number;
  partial: number;
  notDone: number;
  moved: number;
  skipped: number;
  released: number;
  open: number;
  observations: number;
};

export type MonthlyInsightsObservation = {
  body: string;
  category: ObservationCategory;
  label: string;
};

export type MonthlyInsightsTherapyThoughts = {
  count: number;
  recent: Array<{ id: string; body: string }>;
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
  recentObservations: MonthlyInsightsObservation[];
  therapyThoughts: MonthlyInsightsTherapyThoughts | null;
  byTheme: Array<{ label: string; count: number }>;
  byProject: Array<{ label: string; count: number }>;
  themePatterns: Array<{
    name: string;
    total: number;
    done: number;
    moved: number;
    notDone: number;
  }>;
  projectPatterns: Array<{
    name: string;
    total: number;
    done: number;
    moved: number;
    notDone: number;
  }>;
};

const UNASSIGNED_THEME_LABEL = "Unassigned";

type ThemeProjectPatternStats = {
  total: number;
  done: number;
  moved: number;
  notDone: number;
};

function createPatternStats(): ThemeProjectPatternStats {
  return { total: 0, done: 0, moved: 0, notDone: 0 };
}

function recordPatternStatus(
  pattern: ThemeProjectPatternStats,
  status: PlanItemStatus,
) {
  pattern.total += 1;
  if (status === "DONE") pattern.done += 1;
  if (status === "MOVED") pattern.moved += 1;
  if (status === "NOT_DONE") pattern.notDone += 1;
}

function resolveThemeLabel(item: {
  theme: { name: string } | null;
  project: { name: string; theme: { name: string } | null } | null;
}): string {
  if (item.theme?.name) {
    return item.theme.name;
  }

  if (item.project?.theme?.name) {
    return item.project.theme.name;
  }

  return UNASSIGNED_THEME_LABEL;
}

function sortThemeRows(
  entries: Array<[string, number]>,
): Array<{ label: string; count: number }> {
  return entries
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (a.label === UNASSIGNED_THEME_LABEL) return 1;
      if (b.label === UNASSIGNED_THEME_LABEL) return -1;
      return b.count - a.count || a.label.localeCompare(b.label);
    })
    .slice(0, 8);
}

const STATUS_ORDER = PLAN_ITEM_STATUS_ORDER;

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
  const canTherapy = canUseTherapyThoughts(access ?? {});

  const [plans, observations, therapyThoughts] = await Promise.all([
    prisma.plan.findMany({
      where: {
        userId,
        dateStart: { lte: end },
        dateEnd: { gte: start },
      },
      include: {
        items: {
          include: {
            theme: { select: { name: true } },
            project: {
              select: {
                name: true,
                theme: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    canReflect
      ? prisma.planObservation.findMany({
          where: {
            userId,
            createdAt: { gte: start, lte: end },
          },
          select: { category: true, body: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canTherapy
      ? prisma.therapyThought.findMany({
          where: {
            userId,
            createdAt: { gte: start, lte: end },
            plan: { type: "DAY" },
          },
          select: { id: true, body: true, createdAt: true },
          orderBy: { createdAt: "desc" },
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
  const themeCounts = new Map<string, number>();
  const projectCounts = new Map<string, number>();
  const themePatterns = new Map<string, ThemeProjectPatternStats>();
  const projectPatterns = new Map<string, ThemeProjectPatternStats>();
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

    const themeLabel = resolveThemeLabel(item);
    incrementMap(themeCounts, themeLabel);
    const themePattern = themePatterns.get(themeLabel) ?? createPatternStats();
    recordPatternStatus(themePattern, item.status);
    themePatterns.set(themeLabel, themePattern);

    if (item.project?.name) {
      incrementMap(projectCounts, item.project.name);
      const projectPattern =
        projectPatterns.get(item.project.name) ?? createPatternStats();
      recordPatternStatus(projectPattern, item.status);
      projectPatterns.set(item.project.name, projectPattern);
    }

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

  const byTheme =
    actionableItems > 0
      ? sortThemeRows([...themeCounts.entries()])
      : [];

  const byProject =
    actionableItems > 0
      ? [...projectCounts.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
          .slice(0, 8)
      : [];

  const themePatternRows = [...themePatterns.entries()]
    .filter(([name]) => name !== UNASSIGNED_THEME_LABEL)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 8);

  const projectPatternRows = [...projectPatterns.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 8);

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

  const recentObservations = observations
    .map((observation) => {
      const body = observation.body.trim();
      if (!body) {
        return null;
      }

      return {
        body,
        category: observation.category,
        label: getObservationCategoryLabel(observation.category),
      };
    })
    .filter((entry): entry is MonthlyInsightsObservation => entry !== null)
    .slice(0, 5);

  const therapyThoughtsSummary = canTherapy
    ? {
        count: therapyThoughts.length,
        recent: therapyThoughts.slice(0, 5).map((thought) => ({
          id: thought.id,
          body: thought.body.trim(),
        })),
      }
    : null;

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
      notDone: statusCounts.get("NOT_DONE") ?? 0,
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
    recentObservations,
    therapyThoughts: therapyThoughtsSummary,
    byTheme,
    byProject,
    themePatterns: themePatternRows,
    projectPatterns: projectPatternRows,
  };
}
