import type { CareerPracticeType } from "@/app/generated/prisma/client";

import {
  CAREER_THEME_NAME,
  EXPO_PRINT_PROJECT_NAME,
  JOB_HUNT_PROJECT_NAME,
  PRACTICE_TYPE_TO_PILLAR,
} from "@/lib/career-journey/constants";
import { CareerJourneyError } from "@/lib/career-journey/career-journey";
import { formatDateString } from "@/lib/dates";
import { createPlanItem, getOrCreateDayPlan } from "@/lib/plans";
import { getThemeProjectCatalog } from "@/lib/themes-projects";
import { prisma } from "@/lib/prisma";

const CAREER_PILLAR_NAMES = new Set(Object.values(PRACTICE_TYPE_TO_PILLAR));

function findThemeByName(
  catalog: Awaited<ReturnType<typeof getThemeProjectCatalog>>,
  name: string,
) {
  return catalog.themes.find(
    (theme) => theme.name.toLowerCase() === name.toLowerCase(),
  );
}

function findProjectByName(
  catalog: Awaited<ReturnType<typeof getThemeProjectCatalog>>,
  name: string,
) {
  return catalog.projects.find(
    (project) => project.name.toLowerCase() === name.toLowerCase(),
  );
}

function resolveAssignment(
  catalog: Awaited<ReturnType<typeof getThemeProjectCatalog>>,
  type: CareerPracticeType,
  title: string,
): { themeId?: string | null; projectId?: string | null } {
  const lowerTitle = title.toLowerCase();

  if (type === "PROJECT" && lowerTitle.includes("expoprint")) {
    const project = findProjectByName(catalog, EXPO_PRINT_PROJECT_NAME);
    if (project) {
      return { projectId: project.id, themeId: project.themeId };
    }
  }

  if (type === "APPLICATION") {
    const project = findProjectByName(catalog, JOB_HUNT_PROJECT_NAME);
    if (project) {
      return { projectId: project.id, themeId: project.themeId };
    }
  }

  const pillarName = PRACTICE_TYPE_TO_PILLAR[type];
  if (CAREER_PILLAR_NAMES.has(pillarName)) {
    const theme = findThemeByName(catalog, CAREER_THEME_NAME);
    if (theme) {
      return { themeId: theme.id, projectId: null };
    }
  }

  return { themeId: null, projectId: null };
}

export async function addCareerSessionToTodayPlan(
  userId: string,
  sessionId: string,
): Promise<{ planId: string; itemId: string }> {
  const session = await prisma.careerPracticeSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    throw new CareerJourneyError("Session not found.");
  }

  const today = new Date();
  const plan = await getOrCreateDayPlan(userId, today);
  const catalog = await getThemeProjectCatalog(userId);
  const assignment = resolveAssignment(catalog, session.type, session.title);

  const item = await createPlanItem({
    userId,
    planId: plan.id,
    title: session.title,
    type: "TASK",
    comment: session.notes ?? undefined,
    themeId: assignment.themeId,
    projectId: assignment.projectId,
  });

  await prisma.careerPracticeSession.update({
    where: { id: session.id },
    data: { status: "PLANNED" },
  });

  return { planId: plan.id, itemId: item.id };
}

export function todayDateString(): string {
  return formatDateString(new Date());
}
