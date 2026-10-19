import type {
  PlanItemView,
  PlanOrganizeView,
  ReadingDensity,
  TaskOrganizationDisplay,
} from "@/app/generated/prisma/client";

import type { PlanOrganizeViewValue } from "@/lib/life-areas/types";
import { DEFAULT_TASK_ORGANIZATION_DISPLAY } from "@/lib/task-organization-display";
import {
  readingDensityFromPrisma,
  readingDensityToPrisma,
  type ReadingDensityValue,
} from "@/lib/reading-density";
import { prisma } from "@/lib/prisma";

export type PlanningPreferences = {
  planItemView: PlanItemView;
  taskOrganizationDisplay: TaskOrganizationDisplay;
  planOrganizeView: PlanOrganizeViewValue;
};

export async function getPlanItemViewForUser(
  userId: string,
): Promise<PlanItemView> {
  const preferences = await getPlanningPreferencesForUser(userId);
  return preferences.planItemView;
}

export async function getPlanningPreferencesForUser(
  userId: string,
): Promise<PlanningPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planItemView: true,
      taskOrganizationDisplay: true,
      planOrganizeView: true,
    },
  });

  return {
    planItemView: user?.planItemView ?? "CHECKLIST",
    taskOrganizationDisplay:
      user?.taskOrganizationDisplay ?? DEFAULT_TASK_ORGANIZATION_DISPLAY,
    planOrganizeView:
      user?.planOrganizeView === "LIFE_AREAS" ? "LIFE_AREAS" : "LIST",
  };
}

export async function updatePlanOrganizeViewPreference(
  userId: string,
  planOrganizeView: PlanOrganizeView | PlanOrganizeViewValue,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      planOrganizeView:
        planOrganizeView === "LIFE_AREAS" ? "LIFE_AREAS" : "LIST",
    },
  });
}

export async function updatePlanItemView(
  userId: string,
  planItemView: PlanItemView,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { planItemView },
  });
}

export async function updateTaskOrganizationDisplay(
  userId: string,
  taskOrganizationDisplay: TaskOrganizationDisplay,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { taskOrganizationDisplay },
  });
}

export async function getMobileNavItemsForUser(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mobileNavItems: true },
  });

  return user?.mobileNavItems ?? [];
}

export async function updateMobileNavItems(
  userId: string,
  mobileNavItems: string[],
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { mobileNavItems },
  });
}

export async function getReadingDensityForUser(
  userId: string,
): Promise<ReadingDensityValue> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { readingDensity: true },
  });

  return readingDensityFromPrisma(user?.readingDensity);
}

export async function updateReadingDensity(
  userId: string,
  value: ReadingDensityValue,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { readingDensity: readingDensityToPrisma(value) },
  });
}
