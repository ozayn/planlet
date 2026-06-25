"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  createLearningEntry,
  deleteLearningEntry,
  updateLearningEntry,
  type CreateLearningEntryInput,
  type UpdateLearningEntryInput,
  LearningJourneyError,
} from "@/lib/learning-journey";
import { canUseLearningJourneyFeatures } from "@/lib/roles";

export type LearningJourneyActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireLearningJourneySession() {
  const session = await auth();
  if (!session?.user?.id || !canUseLearningJourneyFeatures(session.user)) {
    throw new LearningJourneyError("Not authorized.");
  }
  return session;
}

function revalidateLearningJourney() {
  revalidatePath("/learning");
}

export async function createLearningEntryAction(
  input: CreateLearningEntryInput,
): Promise<LearningJourneyActionResult> {
  try {
    const session = await requireLearningJourneySession();
    await createLearningEntry(session.user.id, input);
    revalidateLearningJourney();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof LearningJourneyError
          ? error.message
          : "Failed to save learning entry.",
    };
  }
}

export async function deleteLearningEntryAction(
  entryId: string,
): Promise<LearningJourneyActionResult> {
  try {
    const session = await requireLearningJourneySession();
    await deleteLearningEntry(session.user.id, entryId);
    revalidateLearningJourney();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof LearningJourneyError
          ? error.message
          : "Failed to delete learning entry.",
    };
  }
}

export async function updateLearningEntryAction(
  entryId: string,
  input: UpdateLearningEntryInput,
): Promise<LearningJourneyActionResult> {
  try {
    const session = await requireLearningJourneySession();
    await updateLearningEntry(session.user.id, entryId, input);
    revalidateLearningJourney();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof LearningJourneyError
          ? error.message
          : "Failed to update learning entry.",
    };
  }
}
