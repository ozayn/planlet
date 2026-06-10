import type { PlanType } from "@/app/generated/prisma/client";
import { PlanType as PlanTypeEnum } from "@/app/generated/prisma/client";
import { toZonedTime } from "date-fns-tz";

import { APP_TIMEZONE } from "@/config/time";
import {
  type DateRange,
  formatDateString,
  formatPlanDateLabel,
  formatShareMonthPeriod,
  formatShareWeekPeriod,
  formatShareYearPeriod,
  formatWeekStartString,
  getMonthRange,
  getWeekRange,
  getYearRange,
} from "@/lib/dates";
import { isActionableItemType, isIntentionItemType, isNoteItemType } from "@/lib/plan-item-sections";
import { OBSERVATION_CATEGORIES } from "@/lib/observation-constants";
import { getObservationCategoryLabel } from "@/lib/observation-labels";
import {
  getGratitudesForPlans,
  type SerializedGratitude,
} from "@/lib/gratitude";
import {
  getObservationsForPlans,
  type SerializedObservation,
} from "@/lib/observations";
import { canUseReflectionFeatures } from "@/lib/roles";
import { getMonthPlan, getWeekPlan, getYearPlan } from "@/lib/plans";
import { serializePlan, type SerializedPlan } from "@/lib/plan-serialize";
import { prisma } from "@/lib/prisma";
import type {
  PeriodSummary,
  PeriodSummaryCompletedTier,
  PeriodSummaryData,
  PeriodSummaryIncludedPlan,
  PeriodSummaryItem,
  PeriodSummaryItemGroup,
  PeriodSummaryItemSource,
  PeriodSummaryItemTier,
  PeriodSummaryGratitude,
  PeriodSummaryObservation,
  PeriodSummaryObservationGroup,
  PeriodSummaryType,
} from "@/lib/period-summary-types";
import { periodSummaryCopyLabel, periodSummaryTierLabel } from "@/lib/period-summary-types";

export type {
  PeriodSummary,
  PeriodSummaryData,
  PeriodSummaryItem,
  PeriodSummaryType,
} from "@/lib/period-summary-types";

const rootItemsInclude = {
  where: { parentItemId: null },
  orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  include: {
    subtasks: {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        themes: { include: { theme: true } },
        _count: { select: { comments: true } },
      },
    },
    themes: { include: { theme: true } },
    _count: { select: { comments: true } },
  },
};

function shareDateFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: APP_TIMEZONE });
}

function formatDayLabel(date: Date): string {
  return shareDateFormatter({ weekday: "long" }).format(date);
}

export function getPeriodRange(
  type: PeriodSummaryType,
  date: Date,
): DateRange {
  switch (type) {
    case "WEEK":
      return getWeekRange(date);
    case "MONTH":
      return getMonthRange(date);
    case "YEAR":
      return getYearRange(date);
  }
}

function formatPeriodLabel(
  type: PeriodSummaryType,
  start: Date,
  end: Date,
): string {
  switch (type) {
    case "WEEK":
      return formatShareWeekPeriod(start, end);
    case "MONTH":
      return formatShareMonthPeriod(start);
    case "YEAR":
      return formatShareYearPeriod(start);
  }
}

function planHref(
  type: PlanType,
  id: string,
  dateStart: Date,
  dateEnd: Date,
): string {
  switch (type) {
    case "DAY":
      return `/plans/day/${formatDateString(dateStart)}`;
    case "WEEK":
      return `/plans/week/${formatWeekStartString(dateStart)}`;
    default:
      return `/plans/${id}`;
  }
}

function planGroupLabel(
  type: PlanType,
  dateStart: Date,
  dateEnd: Date,
  title: string,
): string {
  switch (type) {
    case "DAY":
      return formatDayLabel(toZonedTime(dateStart, APP_TIMEZONE));
    case "WEEK":
      return formatPlanDateLabel(dateStart, "WEEK", dateEnd);
    case "MONTH":
      return formatShareMonthPeriod(dateStart);
    case "YEAR":
      return formatShareYearPeriod(dateStart);
    default:
      return title;
  }
}

function planTier(type: PlanType): PeriodSummaryItemTier {
  switch (type) {
    case "DAY":
      return "daily";
    case "WEEK":
      return "weekly";
    case "MONTH":
      return "monthly";
    default:
      return "period";
  }
}

function periodPlanTierLabel(type: PeriodSummaryType): string {
  switch (type) {
    case "WEEK":
      return "Weekly plan";
    case "MONTH":
      return "Monthly plan";
    case "YEAR":
      return "Yearly plan";
  }
}

function getPeriodPlanHref(
  type: PeriodSummaryType,
  periodStart: string,
  periodPlanId: string | null,
): string {
  switch (type) {
    case "WEEK":
      return `/plans/week/${periodStart}`;
    case "MONTH":
    case "YEAR":
      return periodPlanId ? `/plans/${periodPlanId}` : "/plans/new";
  }
}

function childPlanTypes(type: PeriodSummaryType): PlanType[] {
  switch (type) {
    case "WEEK":
      return [PlanTypeEnum.DAY];
    case "MONTH":
      return [PlanTypeEnum.DAY, PlanTypeEnum.WEEK];
    case "YEAR":
      return [PlanTypeEnum.DAY, PlanTypeEnum.WEEK, PlanTypeEnum.MONTH];
  }
}

function tierSortOrder(tier: PeriodSummaryItemTier): number {
  switch (tier) {
    case "period":
      return 0;
    case "monthly":
      return 1;
    case "weekly":
      return 2;
    case "daily":
      return 3;
  }
}

function collectItemsFromPlan(
  plan: SerializedPlan,
  source: PeriodSummaryItemSource,
): PeriodSummaryItem[] {
  return plan.items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    source,
  }));
}

function groupCompletedByTier(
  items: PeriodSummaryItem[],
  periodType: PeriodSummaryType,
): PeriodSummaryCompletedTier[] {
  const tiers = new Map<
    PeriodSummaryItemTier,
    Map<string, PeriodSummaryItem[]>
  >();

  for (const item of items) {
    const tierMap = tiers.get(item.source.tier) ?? new Map();
    const groupItems = tierMap.get(item.source.groupLabel) ?? [];
    groupItems.push(item);
    tierMap.set(item.source.groupLabel, groupItems);
    tiers.set(item.source.tier, tierMap);
  }

  return Array.from(tiers.entries())
    .sort(([a], [b]) => tierSortOrder(a) - tierSortOrder(b))
    .map(([tier, groupMap]) => ({
      tier,
      tierLabel: periodSummaryTierLabel(periodType, tier),
      groups: Array.from(groupMap.entries()).map(([label, groupItems]) => ({
        label,
        items: groupItems,
      })),
    }));
}

function findRepeatedThemes(intentions: PeriodSummaryItem[]): string[] {
  const counts = new Map<string, number>();

  for (const item of intentions) {
    const key = item.title.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([title]) => title)
    .slice(0, 5);
}

function formatItemLine(item: PeriodSummaryItem): string {
  return item.title.trim();
}

export function generatePeriodSummaryText(
  summary: Omit<PeriodSummary, "copyText">,
): string {
  const lines: string[] = [
    `${periodSummaryCopyLabel(summary.periodType)} — ${summary.periodLabel}`,
    "",
    "At a glance",
    `- Plans included: ${summary.atAGlance.plansIncluded}`,
    `- Completed: ${summary.atAGlance.itemsCompleted}`,
    `- Still open: ${summary.atAGlance.stillOpen}`,
    `- Moved/skipped: ${summary.atAGlance.movedSkipped}`,
    `- Intentions: ${summary.atAGlance.intentions}`,
    `- Notes/reflections: ${summary.atAGlance.notes}`,
    "",
  ];

  if (summary.completed.length > 0) {
    lines.push("Completed");
    for (const tier of summary.completed) {
      for (const group of tier.groups) {
        for (const item of group.items) {
          lines.push(`- ${group.label}: ${formatItemLine(item)}`);
        }
      }
    }
    lines.push("");
  }

  if (summary.stillOpen.length > 0) {
    lines.push("Carry forward");
    for (const item of summary.stillOpen) {
      lines.push(`- ${item.source.groupLabel}: ${formatItemLine(item)}`);
    }
    lines.push("");
  }

  const movedSkipped = [
    ...summary.moved.map((item) => ({ kind: "Moved", item })),
    ...summary.skipped.map((item) => ({ kind: "Skipped", item })),
    ...summary.released.map((item) => ({ kind: "Released", item })),
  ];

  if (movedSkipped.length > 0) {
    lines.push("Moved / skipped");
    for (const entry of movedSkipped) {
      lines.push(
        `- ${entry.kind} · ${entry.item.source.groupLabel}: ${formatItemLine(entry.item)}`,
      );
    }
    lines.push("");
  }

  if (summary.intentions.length > 0) {
    lines.push("Intentions");
    for (const item of summary.intentions) {
      lines.push(`- ${item.source.groupLabel}: ${formatItemLine(item)}`);
    }
    lines.push("");
  }

  if (summary.notes.length > 0) {
    lines.push("Notes & reflections");
    for (const item of summary.notes) {
      lines.push(`- ${item.source.groupLabel}: ${formatItemLine(item)}`);
    }
    lines.push("");
  }

  if (summary.observations.length > 0) {
    lines.push("Private observations");
    for (const group of summary.observationsByCategory) {
      for (const observation of group.items) {
        lines.push(
          `- ${group.categoryLabel} · ${observation.planGroupLabel}: ${observation.body.trim()}`,
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function groupObservationsByCategory(
  observations: PeriodSummaryObservation[],
): PeriodSummaryObservationGroup[] {
  const groups = new Map<string, PeriodSummaryObservation[]>();

  for (const observation of observations) {
    const existing = groups.get(observation.category) ?? [];
    existing.push(observation);
    groups.set(observation.category, existing);
  }

  return OBSERVATION_CATEGORIES.flatMap((category) => {
    const items = groups.get(category);
    if (!items || items.length === 0) {
      return [];
    }

    return [
      {
        category,
        categoryLabel: getObservationCategoryLabel(category),
        items,
      },
    ];
  });
}

function attachPlanLabels<T extends { planId: string }>(
  entries: T[],
  planLabels: Map<string, string>,
): Array<T & { planGroupLabel: string }> {
  return entries.map((entry) => ({
    ...entry,
    planGroupLabel: planLabels.get(entry.planId) ?? "Plan",
  }));
}

type PeriodSummaryBuildInput = PeriodSummaryData & {
  childPlans: Array<{
    meta: PeriodSummaryIncludedPlan;
    plan: SerializedPlan;
  }>;
  observations: PeriodSummaryObservation[];
  gratitudes: PeriodSummaryGratitude[];
};

export function buildPeriodSummary(input: PeriodSummaryBuildInput): PeriodSummary {
  const items: PeriodSummaryItem[] = [];

  if (input.periodPlan) {
    items.push(
      ...collectItemsFromPlan(input.periodPlan, {
        planId: input.periodPlan.id,
        planType: input.periodPlan.type,
        planTitle: input.periodPlan.title,
        groupLabel: periodPlanTierLabel(input.periodType),
        tier: "period",
      }),
    );
  }

  for (const child of input.childPlans) {
    items.push(
      ...collectItemsFromPlan(child.plan, {
        planId: child.meta.id,
        planType: child.meta.type,
        planTitle: child.meta.title,
        groupLabel: child.meta.groupLabel,
        tier: child.meta.tier,
      }),
    );
  }

  const actionable = items.filter((item) => isActionableItemType(item.type));
  const intentions = items.filter((item) => isIntentionItemType(item.type));
  const notes = items.filter((item) => isNoteItemType(item.type));

  const completedItems = actionable.filter((item) => item.status === "DONE");
  const stillOpen = actionable.filter(
    (item) => item.status === "OPEN" || item.status === "PARTIAL",
  );
  const moved = actionable.filter((item) => item.status === "MOVED");
  const skipped = actionable.filter((item) => item.status === "SKIPPED");
  const released = actionable.filter((item) => item.status === "RELEASED");

  const planCount =
    (input.periodPlan ? 1 : 0) + input.includedPlans.length;
  const hasAnyPlans = planCount > 0;
  const hasAnyContent =
    items.length > 0 ||
    input.observations.length > 0 ||
    input.gratitudes.length > 0;
  const observationsByCategory = groupObservationsByCategory(
    input.observations,
  );

  const base: Omit<PeriodSummary, "copyText"> = {
    periodType: input.periodType,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    periodStartDate: input.periodStartDate,
    periodEndDate: input.periodEndDate,
    periodLabel: input.periodLabel,
    periodPlan: input.periodPlan,
    periodPlanHref: input.periodPlanHref,
    includedPlans: input.includedPlans,
    items,
    atAGlance: {
      plansIncluded: planCount,
      itemsCompleted: completedItems.length,
      stillOpen: stillOpen.length,
      movedSkipped: moved.length + skipped.length + released.length,
      intentions: intentions.length,
      notes: notes.length,
      observations: input.observations.length,
      gratitudes: input.gratitudes.length,
    },
    completed: groupCompletedByTier(completedItems, input.periodType),
    stillOpen,
    moved,
    skipped,
    released,
    intentions,
    notes,
    repeatedThemes: findRepeatedThemes(intentions),
    observations: input.observations,
    observationsByCategory,
    gratitudes: input.gratitudes,
    hasAnyPlans,
    hasAnyContent,
  };

  return {
    ...base,
    copyText: generatePeriodSummaryText(base),
  };
}

type FetchedChildPlan = Awaited<
  ReturnType<typeof prisma.plan.findMany<{ include: { items: typeof rootItemsInclude } }>>
>[number];

function toIncludedPlan(
  plan: FetchedChildPlan,
): PeriodSummaryIncludedPlan & { plan: SerializedPlan } {
  const serialized = serializePlan(plan);
  const tier = planTier(plan.type);

  return {
    id: plan.id,
    title: plan.title,
    type: plan.type,
    href: planHref(plan.type, plan.id, plan.dateStart, plan.dateEnd),
    groupLabel: planGroupLabel(
      plan.type,
      plan.dateStart,
      plan.dateEnd,
      plan.title,
    ),
    tier,
    plan: serialized,
  };
}

export async function getPeriodSummaryData(
  userId: string,
  type: PeriodSummaryType,
  date: Date,
): Promise<PeriodSummaryBuildInput> {
  const { start, end } = getPeriodRange(type, date);
  const periodStart =
    type === "WEEK" ? formatWeekStartString(date) : formatDateString(start);
  const periodEnd = formatDateString(end);
  const periodLabel = formatPeriodLabel(type, start, end);

  const [periodPlanRecord, childPlanRecords] = await Promise.all([
    type === "WEEK"
      ? getWeekPlan(userId, date)
      : type === "MONTH"
        ? getMonthPlan(userId, date)
        : getYearPlan(userId, date),
    prisma.plan.findMany({
      where: {
        userId,
        type: { in: childPlanTypes(type) },
        dateStart: { gte: start, lte: end },
      },
      orderBy: { dateStart: "asc" },
      include: {
        items: rootItemsInclude,
      },
    }),
  ]);

  const periodPlan = periodPlanRecord ? serializePlan(periodPlanRecord) : null;
  const childPlans = childPlanRecords.map((plan) => {
    const included = toIncludedPlan(plan);
    const { plan: serialized, ...meta } = included;

    return {
      meta,
      plan: serialized,
    };
  });

  const periodPlanHref = getPeriodPlanHref(
    type,
    periodStart,
    periodPlan?.id ?? null,
  );

  const planLabels = new Map<string, string>();
  if (periodPlan) {
    planLabels.set(periodPlan.id, periodPlanTierLabel(type));
  }
  for (const child of childPlans) {
    planLabels.set(child.meta.id, child.meta.groupLabel);
  }

  const planIds = [...planLabels.keys()];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      canGiveFeedback: true,
      canUseReflectionFeatures: true,
    },
  });
  const canReflect = user ? canUseReflectionFeatures(user) : false;

  const [rawObservations, rawGratitudes] = canReflect
    ? await Promise.all([
        getObservationsForPlans(planIds, userId),
        getGratitudesForPlans(planIds, userId),
      ])
    : [[], []];

  const observations = attachPlanLabels(
    rawObservations,
    planLabels,
  ) as PeriodSummaryObservation[];
  const gratitudes = attachPlanLabels(
    rawGratitudes,
    planLabels,
  ) as PeriodSummaryGratitude[];

  return {
    periodType: type,
    periodStart,
    periodEnd,
    periodStartDate: start,
    periodEndDate: end,
    periodLabel,
    periodPlan,
    periodPlanHref,
    includedPlans: childPlans.map(({ meta }) => meta),
    childPlans,
    observations,
    gratitudes,
  };
}

export async function getPeriodSummary(
  userId: string,
  type: PeriodSummaryType,
  date: Date,
): Promise<PeriodSummary> {
  const data = await getPeriodSummaryData(userId, type, date);
  return buildPeriodSummary(data);
}

export { getPeriodSummaryHref } from "@/lib/period-summary-links";
