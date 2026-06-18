import type {
  ObservationCategory,
  PlanItemStatus,
  PlanItemType,
  PlanType,
} from "@/app/generated/prisma/client";

import type { SerializedGratitude } from "@/lib/gratitude";
import type { SerializedObservation } from "@/lib/observations";
import type { SerializedPlan } from "@/lib/plan-serialize";

export type PeriodSummaryType = "WEEK" | "MONTH" | "YEAR";

export type PeriodSummaryItemSource = {
  planId: string;
  planType: PlanType;
  planTitle: string;
  groupLabel: string;
  tier: PeriodSummaryItemTier;
};

export type PeriodSummaryItemTier =
  | "period"
  | "monthly"
  | "weekly"
  | "daily";

export type PeriodSummaryItem = {
  id: string;
  title: string;
  type: PlanItemType;
  status: PlanItemStatus;
  source: PeriodSummaryItemSource;
};

export type PeriodSummaryIncludedPlan = {
  id: string;
  title: string;
  type: PlanType;
  href: string;
  groupLabel: string;
  tier: PeriodSummaryItemTier;
};

export type PeriodSummaryData = {
  periodType: PeriodSummaryType;
  periodStart: string;
  periodEnd: string;
  periodStartDate: Date;
  periodEndDate: Date;
  periodLabel: string;
  periodPlan: SerializedPlan | null;
  periodPlanHref: string;
  includedPlans: PeriodSummaryIncludedPlan[];
};

export type PeriodSummaryObservation = SerializedObservation & {
  planGroupLabel: string;
};

export type PeriodSummaryObservationGroup = {
  category: ObservationCategory;
  categoryLabel: string;
  items: PeriodSummaryObservation[];
};

export type PeriodSummaryGratitude = SerializedGratitude & {
  planGroupLabel: string;
};

export type PeriodSummaryAtAGlance = {
  plansIncluded: number;
  itemsCompleted: number;
  stillOpen: number;
  movedSkipped: number;
  intentions: number;
  notes: number;
  observations: number;
  gratitudes: number;
};

export type PeriodSummaryItemGroup = {
  label: string;
  items: PeriodSummaryItem[];
};

export type PeriodSummaryCompletedTier = {
  tier: PeriodSummaryItemTier;
  tierLabel: string;
  groups: PeriodSummaryItemGroup[];
};

export type PeriodSummary = PeriodSummaryData & {
  items: PeriodSummaryItem[];
  atAGlance: PeriodSummaryAtAGlance;
  completed: PeriodSummaryCompletedTier[];
  stillOpen: PeriodSummaryItem[];
  notDone: PeriodSummaryItem[];
  moved: PeriodSummaryItem[];
  skipped: PeriodSummaryItem[];
  released: PeriodSummaryItem[];
  intentions: PeriodSummaryItem[];
  notes: PeriodSummaryItem[];
  repeatedThemes: string[];
  observations: PeriodSummaryObservation[];
  observationsByCategory: PeriodSummaryObservationGroup[];
  gratitudes: PeriodSummaryGratitude[];
  hasAnyPlans: boolean;
  hasAnyContent: boolean;
  copyText: string;
};

const TIER_LABELS: Record<PeriodSummaryItemTier, string> = {
  period: "Period plan",
  monthly: "Monthly plans",
  weekly: "Weekly plans",
  daily: "Daily plans",
};

const PERIOD_TIER_LABELS: Record<PeriodSummaryType, string> = {
  WEEK: "Weekly plan",
  MONTH: "Monthly plan",
  YEAR: "Yearly plan",
};

export function periodSummaryTierLabel(
  type: PeriodSummaryType,
  tier: PeriodSummaryItemTier,
): string {
  if (tier === "period") {
    return PERIOD_TIER_LABELS[type];
  }

  return TIER_LABELS[tier];
}

export function periodSummaryItemMeta(item: PeriodSummaryItem): string {
  return item.source.groupLabel;
}

export function periodSummaryPageTitle(type: PeriodSummaryType): string {
  switch (type) {
    case "WEEK":
      return "Week summary";
    case "MONTH":
      return "Month summary";
    case "YEAR":
      return "Year summary";
  }
}

export function periodSummaryIntro(type: PeriodSummaryType): string {
  switch (type) {
    case "WEEK":
      return "A gentle look back at what you planned and how the week unfolded.";
    case "MONTH":
      return "A gentle look back at what you planned and how the month unfolded.";
    case "YEAR":
      return "A gentle look back at what you planned over the year.";
  }
}

export function periodSummaryCopyLabel(type: PeriodSummaryType): string {
  switch (type) {
    case "WEEK":
      return "Week summary";
    case "MONTH":
      return "Month summary";
    case "YEAR":
      return "Year summary";
  }
}

export function periodSummaryOpenPlanLabel(type: PeriodSummaryType): string {
  switch (type) {
    case "WEEK":
      return "Open weekly plan";
    case "MONTH":
      return "Open monthly plan";
    case "YEAR":
      return "Open yearly plan";
  }
}
