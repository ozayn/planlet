import { canUseReflectionFeatures } from "@/lib/roles";
import { touchPlan } from "@/lib/touch-plan";
import { touchUserSeen } from "@/lib/user-activity";
import { prisma } from "@/lib/prisma";

export const MAX_GRATITUDE_LENGTH = 2000;

export class GratitudeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GratitudeError";
  }
}

export type SerializedGratitude = {
  id: string;
  planId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

function serializeGratitude(gratitude: {
  id: string;
  planId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}): SerializedGratitude {
  return {
    id: gratitude.id,
    planId: gratitude.planId,
    body: gratitude.body,
    createdAt: gratitude.createdAt.toISOString(),
    updatedAt: gratitude.updatedAt.toISOString(),
  };
}

function validateBody(body: string): string {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new GratitudeError("Gratitude cannot be empty.");
  }

  if (trimmed.length > MAX_GRATITUDE_LENGTH) {
    throw new GratitudeError(
      `Gratitude must be ${MAX_GRATITUDE_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

async function requireReflectionUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      canGiveFeedback: true,
      canUseReflectionFeatures: true,
    },
  });

  if (!user || !canUseReflectionFeatures(user)) {
    throw new GratitudeError("Not authorized.");
  }
}

async function requirePlanOwner(planId: string, userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });

  if (!plan) {
    throw new GratitudeError("Plan not found.");
  }

  return plan;
}

async function requireGratitudeOwner(gratitudeId: string, userId: string) {
  const gratitude = await prisma.planGratitude.findFirst({
    where: { id: gratitudeId, userId },
    select: { id: true, planId: true },
  });

  if (!gratitude) {
    throw new GratitudeError("Gratitude not found.");
  }

  return gratitude;
}

export async function getGratitudesForPlan(
  planId: string,
  userId: string,
): Promise<SerializedGratitude[]> {
  await requireReflectionUser(userId);
  await requirePlanOwner(planId, userId);

  const gratitudes = await prisma.planGratitude.findMany({
    where: { planId, userId },
    orderBy: { createdAt: "asc" },
  });

  return gratitudes.map(serializeGratitude);
}

export async function getGratitudesForPlans(
  planIds: string[],
  userId: string,
): Promise<SerializedGratitude[]> {
  if (planIds.length === 0) {
    return [];
  }

  await requireReflectionUser(userId);

  const gratitudes = await prisma.planGratitude.findMany({
    where: {
      planId: { in: planIds },
      userId,
    },
    orderBy: { createdAt: "asc" },
  });

  return gratitudes.map(serializeGratitude);
}

export async function addPlanGratitude(
  planId: string,
  userId: string,
  body: string,
) {
  await requireReflectionUser(userId);
  await requirePlanOwner(planId, userId);

  const trimmed = validateBody(body);

  const gratitude = await prisma.planGratitude.create({
    data: {
      planId,
      userId,
      body: trimmed,
    },
  });

  await touchPlan(planId);
  await touchUserSeen(userId);

  return {
    planId,
    gratitude: serializeGratitude(gratitude),
  };
}

export async function updatePlanGratitude(
  gratitudeId: string,
  userId: string,
  body: string,
) {
  await requireReflectionUser(userId);

  const existing = await requireGratitudeOwner(gratitudeId, userId);
  const trimmed = validateBody(body);

  const gratitude = await prisma.planGratitude.update({
    where: { id: gratitudeId },
    data: { body: trimmed },
  });

  await touchPlan(existing.planId);
  await touchUserSeen(userId);

  return {
    planId: existing.planId,
    gratitude: serializeGratitude(gratitude),
  };
}

export async function deletePlanGratitude(
  gratitudeId: string,
  userId: string,
) {
  await requireReflectionUser(userId);

  const existing = await requireGratitudeOwner(gratitudeId, userId);

  await prisma.planGratitude.delete({
    where: { id: gratitudeId },
  });

  await touchPlan(existing.planId);
  await touchUserSeen(userId);

  return { planId: existing.planId };
}
