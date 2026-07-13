import type {
  PlanItemView,
  ReadingDensity,
  TaskOrganizationDisplay,
} from "@/app/generated/prisma/client";

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
    },
  });

  return {
    planItemView: user?.planItemView ?? "CHECKLIST",
    taskOrganizationDisplay:
      user?.taskOrganizationDisplay ?? DEFAULT_TASK_ORGANIZATION_DISPLAY,
  };
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
