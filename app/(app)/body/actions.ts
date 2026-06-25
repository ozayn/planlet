"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  BodyJourneyError,
  createBodyEntry,
  deleteBodyEntry,
  parseBodyEntryTags,
  updateBodyEntry,
} from "@/lib/body-journey";
import {
  isBodySide,
  isBodySymptomType,
  type BodySideValue,
  type BodySymptomTypeValue,
} from "@/lib/body-journey-types";
import { isValidDateString, parseDateString } from "@/lib/dates";
import { canUseBodyJourneyFeatures } from "@/lib/roles";

export type BodyActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireBodyJourneySession() {
  const session = await auth();
  if (!session?.user?.id || !canUseBodyJourneyFeatures(session.user)) {
    throw new BodyJourneyError("Not authorized.");
  }

  return session;
}

function mapBodyError(error: unknown): BodyActionResult {
  if (error instanceof BodyJourneyError) {
    return { success: false, error: error.message };
  }

  return { success: false, error: "Something went wrong." };
}

function revalidateBodyPath() {
  revalidatePath("/body");
}

type BodyEntryPayload = {
  observedAt: string;
  bodySide: BodySideValue;
  markerX: number;
  markerY: number;
  symptomType: BodySymptomTypeValue;
  intensity: number;
  notes?: string | null;
  tagsRaw?: string;
};

function parseObservedAt(value: string | undefined): Date {
  const dateString = value?.trim();

  if (!dateString) {
    throw new BodyJourneyError("Observed date is required.");
  }

  if (!isValidDateString(dateString)) {
    throw new BodyJourneyError("Invalid observed date.");
  }

  return parseDateString(dateString);
}

function buildEntryInput(payload: BodyEntryPayload) {
  if (!isBodySide(payload.bodySide)) {
    throw new BodyJourneyError("Invalid body side.");
  }

  if (!isBodySymptomType(payload.symptomType)) {
    throw new BodyJourneyError("Invalid symptom type.");
  }

  return {
    observedAt: parseObservedAt(payload.observedAt),
    bodySide: payload.bodySide,
    markerX: payload.markerX,
    markerY: payload.markerY,
    symptomType: payload.symptomType,
    intensity: payload.intensity,
    notes: payload.notes ?? null,
    tags: parseBodyEntryTags(payload.tagsRaw ?? ""),
  };
}

export async function createBodyEntryAction(
  payload: BodyEntryPayload,
): Promise<BodyActionResult> {
  try {
    const session = await requireBodyJourneySession();
    await createBodyEntry(session.user.id, buildEntryInput(payload));
    revalidateBodyPath();
    return { success: true };
  } catch (error) {
    return mapBodyError(error);
  }
}

export async function updateBodyEntryAction(
  entryId: string,
  payload: BodyEntryPayload,
): Promise<BodyActionResult> {
  try {
    const session = await requireBodyJourneySession();
    await updateBodyEntry(session.user.id, entryId, buildEntryInput(payload));
    revalidateBodyPath();
    return { success: true };
  } catch (error) {
    return mapBodyError(error);
  }
}

export async function deleteBodyEntryAction(
  entryId: string,
): Promise<BodyActionResult> {
  try {
    const session = await requireBodyJourneySession();
    await deleteBodyEntry(session.user.id, entryId);
    revalidateBodyPath();
    return { success: true };
  } catch (error) {
    return mapBodyError(error);
  }
}
