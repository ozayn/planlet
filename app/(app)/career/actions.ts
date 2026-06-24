"use server";

import type {
  CareerPracticeMode,
  CareerPracticeStatus,
  CareerPracticeType,
} from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { generateCareerReflection } from "@/lib/ai/generate-career-reflection";
import { AI_USAGE_FEATURES } from "@/lib/ai/usage";
import { addCareerSessionToTodayPlan } from "@/lib/career-journey/add-to-today";
import { buildCareerReflectionContext } from "@/lib/career-journey/career-reflection-context";
import {
  CareerJourneyError,
  createCareerCheckIn,
  createCareerPracticeSession,
  pauseCareerPillarForWeek,
  saveCareerWeeklyReview,
  updateCareerCurrentFocus,
  updateCareerPillarTarget,
  updateCareerTargetRoles,
  updateCareerPracticeSessionStatus,
} from "@/lib/career-journey/career-journey";
import { formatDateString } from "@/lib/dates";
import { isTextParserConfigured } from "@/lib/env";
import { canUseCareerJourneyFeatures, canUseCoachingFeatures } from "@/lib/roles";

export type CareerActionResult =
  | { success: true }
  | { success: false; error: string };

export type CareerReflectionResult =
  | { success: true; reflection: string; nextKindAction: string }
  | { success: false; error: string };

async function requireCareerJourneySession() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !canUseCareerJourneyFeatures(session.user)
  ) {
    throw new CareerJourneyError("Not authorized.");
  }

  return session;
}

function mapCareerError(error: unknown): CareerActionResult {
  if (error instanceof CareerJourneyError) {
    return { success: false, error: error.message };
  }

  return { success: false, error: "Something went wrong." };
}

function revalidateCareerPaths() {
  revalidatePath("/career");
}

function revalidateCareerAndToday() {
  revalidatePath("/career");
  revalidatePath("/today");
}

export async function updateCareerTargetRolesAction(
  targetRoles: string[],
): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await updateCareerTargetRoles(session.user.id, targetRoles);
    revalidateCareerPaths();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function updateCareerCurrentFocusAction(
  currentFocus: string,
): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await updateCareerCurrentFocus(session.user.id, currentFocus);
    revalidateCareerPaths();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function updateCareerPillarTargetAction(
  pillarId: string,
  weeklyTarget: number,
): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await updateCareerPillarTarget(
      session.user.id,
      pillarId,
      weeklyTarget,
    );
    revalidateCareerPaths();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function createCareerSessionAction(input: {
  type: CareerPracticeType;
  mode: CareerPracticeMode;
  title: string;
  date?: string;
  notes?: string | null;
}): Promise<CareerActionResult & { sessionId?: string }> {
  try {
    const session = await requireCareerJourneySession();
    const created = await createCareerPracticeSession(session.user.id, input);
    revalidateCareerPaths();
    return { success: true, sessionId: created.id };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function createCareerSessionAndAddToTodayAction(input: {
  type: CareerPracticeType;
  mode: CareerPracticeMode;
  title: string;
  date?: string;
}): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    const created = await createCareerPracticeSession(session.user.id, input);
    await addCareerSessionToTodayPlan(session.user.id, created.id);
    revalidateCareerAndToday();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function pauseCareerPillarAction(
  pillarName: string,
): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await pauseCareerPillarForWeek(session.user.id, pillarName);
    revalidateCareerPaths();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function saveCareerWeeklyReviewAction(input: {
  weekStart: string;
  gaveEnergy?: string;
  drainedEnergy?: string;
  roleFeltAlive?: string;
  nextStep?: string;
}): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await saveCareerWeeklyReview(session.user.id, input);
    revalidateCareerPaths();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function updateCareerSessionStatusAction(
  sessionId: string,
  status: CareerPracticeStatus,
): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await updateCareerPracticeSessionStatus(
      session.user.id,
      sessionId,
      status,
    );
    revalidateCareerPaths();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function createCareerCheckInAction(input: {
  energyBefore?: number | null;
  energyAfter?: number | null;
  difficulty?: number | null;
  note?: string | null;
}): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await createCareerCheckIn(session.user.id, {
      date: formatDateString(new Date()),
      ...input,
    });
    revalidateCareerPaths();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function addCareerSessionToTodayAction(
  sessionId: string,
): Promise<CareerActionResult> {
  try {
    const session = await requireCareerJourneySession();
    await addCareerSessionToTodayPlan(session.user.id, sessionId);
    revalidateCareerAndToday();
    return { success: true };
  } catch (error) {
    return mapCareerError(error);
  }
}

export async function generateCareerReflectionAction(): Promise<CareerReflectionResult> {
  try {
    const session = await requireCareerJourneySession();

    if (!canUseCoachingFeatures(session.user)) {
      return { success: false, error: "Coaching access is required." };
    }

    if (!isTextParserConfigured()) {
      return {
        success: false,
        error: "Career reflection is not configured on the server.",
      };
    }

    const context = await buildCareerReflectionContext(
      session.user.id,
      session.user,
    );
    const result = await generateCareerReflection({
      context,
      usageContext: {
        userId: session.user.id,
        feature: AI_USAGE_FEATURES.CAREER_REFLECTION,
      },
    });

    return {
      success: true,
      reflection: result.reflection.trim(),
      nextKindAction: result.nextKindAction.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate career reflection.",
    };
  }
}
