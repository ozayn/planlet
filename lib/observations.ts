import type { ObservationCategory } from "@/app/generated/prisma/client";

import {
  MAX_OBSERVATION_LENGTH,
  OBSERVATION_CATEGORIES,
} from "@/lib/observation-constants";
import { touchPlan } from "@/lib/touch-plan";
import { touchUserSeen } from "@/lib/user-activity";
import { prisma } from "@/lib/prisma";

export { MAX_OBSERVATION_LENGTH } from "@/lib/observation-constants";

export class ObservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObservationError";
  }
}

export type SerializedObservation = {
  id: string;
  planId: string;
  category: ObservationCategory;
  body: string;
  observedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ObservationInput = {
  category: ObservationCategory;
  body: string;
  observedAt?: Date | null;
};

function serializeObservation(
  observation: {
    id: string;
    planId: string;
    category: ObservationCategory;
    body: string;
    observedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
): SerializedObservation {
  return {
    id: observation.id,
    planId: observation.planId,
    category: observation.category,
    body: observation.body,
    observedAt: observation.observedAt?.toISOString() ?? null,
    createdAt: observation.createdAt.toISOString(),
    updatedAt: observation.updatedAt.toISOString(),
  };
}

function validateCategory(category: string): ObservationCategory {
  if (
    !(OBSERVATION_CATEGORIES as readonly string[]).includes(category)
  ) {
    throw new ObservationError("Choose a category.");
  }

  return category as ObservationCategory;
}

function validateBody(body: string): string {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new ObservationError("Observation cannot be empty.");
  }

  if (trimmed.length > MAX_OBSERVATION_LENGTH) {
    throw new ObservationError(
      `Observation must be ${MAX_OBSERVATION_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

async function requirePlanOwner(planId: string, userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });

  if (!plan) {
    throw new ObservationError("Plan not found.");
  }

  return plan;
}

async function requireObservationOwner(observationId: string, userId: string) {
  const observation = await prisma.planObservation.findFirst({
    where: { id: observationId, userId },
    select: { id: true, planId: true },
  });

  if (!observation) {
    throw new ObservationError("Observation not found.");
  }

  return observation;
}

export async function getObservationsForPlan(
  planId: string,
  userId: string,
): Promise<SerializedObservation[]> {
  await requirePlanOwner(planId, userId);

  const observations = await prisma.planObservation.findMany({
    where: { planId, userId },
    orderBy: { createdAt: "asc" },
  });

  return observations.map(serializeObservation);
}

export async function getObservationsForPlans(
  planIds: string[],
  userId: string,
): Promise<SerializedObservation[]> {
  if (planIds.length === 0) {
    return [];
  }

  const observations = await prisma.planObservation.findMany({
    where: {
      planId: { in: planIds },
      userId,
    },
    orderBy: { createdAt: "asc" },
  });

  return observations.map(serializeObservation);
}

export async function addPlanObservation(
  planId: string,
  userId: string,
  data: ObservationInput,
) {
  await requirePlanOwner(planId, userId);

  const category = validateCategory(data.category);
  const body = validateBody(data.body);

  const observation = await prisma.planObservation.create({
    data: {
      planId,
      userId,
      category,
      body,
      observedAt: data.observedAt ?? null,
    },
  });

  await touchPlan(planId);
  await touchUserSeen(userId);

  return {
    planId,
    observation: serializeObservation(observation),
  };
}

export async function updatePlanObservation(
  observationId: string,
  userId: string,
  data: ObservationInput,
) {
  const existing = await requireObservationOwner(observationId, userId);

  const category = validateCategory(data.category);
  const body = validateBody(data.body);

  const observation = await prisma.planObservation.update({
    where: { id: observationId },
    data: {
      category,
      body,
      observedAt: data.observedAt ?? null,
    },
  });

  await touchPlan(existing.planId);
  await touchUserSeen(userId);

  return {
    planId: existing.planId,
    observation: serializeObservation(observation),
  };
}

export async function deletePlanObservation(
  observationId: string,
  userId: string,
) {
  const existing = await requireObservationOwner(observationId, userId);

  await prisma.planObservation.delete({
    where: { id: observationId },
  });

  await touchPlan(existing.planId);
  await touchUserSeen(userId);

  return { planId: existing.planId };
}
