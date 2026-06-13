import { canUseTherapyThoughts } from "@/lib/roles";
import { touchPlan } from "@/lib/touch-plan";
import { touchUserSeen } from "@/lib/user-activity";
import { prisma } from "@/lib/prisma";

export const MAX_THERAPY_THOUGHT_LENGTH = 4000;

export class TherapyThoughtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TherapyThoughtError";
  }
}

export type SerializedTherapyThought = {
  id: string;
  planId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function serializeTherapyThought(thought: {
  id: string;
  planId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): SerializedTherapyThought {
  return {
    id: thought.id,
    planId: thought.planId,
    content: thought.content,
    createdAt: thought.createdAt.toISOString(),
    updatedAt: thought.updatedAt.toISOString(),
  };
}

function validateContent(content: string): string {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new TherapyThoughtError("Therapy thought cannot be empty.");
  }

  if (trimmed.length > MAX_THERAPY_THOUGHT_LENGTH) {
    throw new TherapyThoughtError(
      `Therapy thought must be ${MAX_THERAPY_THOUGHT_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

async function requireReflectorUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || !canUseTherapyThoughts(user)) {
    throw new TherapyThoughtError("Not authorized.");
  }
}

async function requirePlanOwner(planId: string, userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });

  if (!plan) {
    throw new TherapyThoughtError("Plan not found.");
  }

  return plan;
}

async function requireTherapyThoughtOwner(thoughtId: string, userId: string) {
  const thought = await prisma.therapyThought.findFirst({
    where: { id: thoughtId, userId },
    select: { id: true, planId: true },
  });

  if (!thought) {
    throw new TherapyThoughtError("Therapy thought not found.");
  }

  return thought;
}

export async function getTherapyThoughtsForPlan(
  planId: string,
  userId: string,
): Promise<SerializedTherapyThought[]> {
  await requireReflectorUser(userId);
  await requirePlanOwner(planId, userId);

  const thoughts = await prisma.therapyThought.findMany({
    where: { planId, userId },
    orderBy: { createdAt: "asc" },
  });

  return thoughts.map(serializeTherapyThought);
}

export async function addTherapyThought(
  userId: string,
  content: string,
  planId?: string | null,
) {
  await requireReflectorUser(userId);

  if (planId) {
    await requirePlanOwner(planId, userId);
  }

  const trimmed = validateContent(content);

  const thought = await prisma.therapyThought.create({
    data: {
      userId,
      planId: planId ?? null,
      content: trimmed,
    },
  });

  if (planId) {
    await touchPlan(planId);
  }
  await touchUserSeen(userId);

  return {
    planId: thought.planId,
    thought: serializeTherapyThought(thought),
  };
}

export async function updateTherapyThought(
  thoughtId: string,
  userId: string,
  content: string,
) {
  await requireReflectorUser(userId);

  const existing = await requireTherapyThoughtOwner(thoughtId, userId);
  const trimmed = validateContent(content);

  const thought = await prisma.therapyThought.update({
    where: { id: thoughtId },
    data: { content: trimmed },
  });

  if (existing.planId) {
    await touchPlan(existing.planId);
  }
  await touchUserSeen(userId);

  return {
    planId: existing.planId,
    thought: serializeTherapyThought(thought),
  };
}

export async function deleteTherapyThought(
  thoughtId: string,
  userId: string,
) {
  await requireReflectorUser(userId);

  const existing = await requireTherapyThoughtOwner(thoughtId, userId);

  await prisma.therapyThought.delete({
    where: { id: thoughtId },
  });

  if (existing.planId) {
    await touchPlan(existing.planId);
  }
  await touchUserSeen(userId);

  return { planId: existing.planId };
}
