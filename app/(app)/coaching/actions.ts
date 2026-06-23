"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { buildCoachingReflectionContext } from "@/lib/coaching-reflection-context";
import { generateCoachingReflection } from "@/lib/ai/generate-coaching-reflection";
import { isTextParserConfigured } from "@/lib/env";
import {
  getReflectionInfluencePreferencesForUser,
  saveReflectionInfluencePreferencesForUser,
} from "@/lib/reflection-influence-preferences";
import {
  reflectionInfluencePreferencesSchema,
  getAllSelectedInfluenceIds,
  type ReflectionInfluencePreferences,
} from "@/lib/reflection-influences";
import { canUseCoachingFeatures } from "@/lib/roles";

export type CoachingActionResult =
  | { success: true }
  | { success: false; error: string };

export type GenerateCoachingReflectionResult =
  | {
      success: true;
      reflection: string;
      question: string;
      experiment: string;
    }
  | { success: false; error: string };

async function requireCoachingSession() {
  const session = await auth();
  if (!session?.user?.id || !canUseCoachingFeatures(session.user)) {
    throw new Error("Not authorized.");
  }

  return session;
}

export async function saveReflectionInfluencesAction(
  preferences: ReflectionInfluencePreferences,
): Promise<CoachingActionResult> {
  try {
    const session = await requireCoachingSession();
    const parsed = reflectionInfluencePreferencesSchema.safeParse(preferences);

    if (!parsed.success) {
      return { success: false, error: "Invalid reflection influences." };
    }

    await saveReflectionInfluencePreferencesForUser(
      session.user.id,
      session.user,
      parsed.data,
    );
    revalidatePath("/coaching");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save reflection influences.",
    };
  }
}

export async function generateCoachingReflectionAction(): Promise<GenerateCoachingReflectionResult> {
  try {
    const session = await requireCoachingSession();

    if (!isTextParserConfigured()) {
      return {
        success: false,
        error: "AI reflection is not configured on the server.",
      };
    }

    const preferences = await getReflectionInfluencePreferencesForUser(
      session.user.id,
      session.user,
    );

    if (getAllSelectedInfluenceIds(preferences).length === 0) {
      return {
        success: false,
        error: "Choose at least one reflection influence first.",
      };
    }

    const context = await buildCoachingReflectionContext(
      session.user.id,
      session.user,
    );
    const result = await generateCoachingReflection({
      context,
      preferences,
    });

    return {
      success: true,
      reflection: result.reflection.trim(),
      question: result.question.trim(),
      experiment: result.experiment.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate reflection.",
    };
  }
}
