import { PlanType as PlanTypeEnum } from "@/app/generated/prisma/client";
import { formatDateString, formatDayPlanContextLabel } from "@/lib/dates";
import { canUseTherapyThoughts } from "@/lib/roles";
import { touchPlan } from "@/lib/touch-plan";
import { touchUserSeen } from "@/lib/user-activity";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export const MAX_THERAPY_THOUGHT_LENGTH = 4000;

export type TherapyThoughtCollectionFilter = "7d" | "30d" | "all";

export class TherapyThoughtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TherapyThoughtError";
  }
}

export type SerializedTherapyThought = {
  id: string;
  planId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type TherapyThoughtCollectionEntry = {
  id: string;
  planId: string;
  body: string;
  createdAt: string;
};

export type TherapyThoughtCollectionGroup = {
  dateString: string;
  dateLabel: string;
  thoughts: TherapyThoughtCollectionEntry[];
};

function serializeTherapyThought(thought: {
  id: string;
  planId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}): SerializedTherapyThought {
  return {
    id: thought.id,
    planId: thought.planId,
    body: thought.body,
    createdAt: thought.createdAt.toISOString(),
    updatedAt: thought.updatedAt.toISOString(),
  };
}

function validateBody(body: string): string {
  const trimmed = body.trim();

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

async function requireTherapyThoughtAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || !canUseTherapyThoughts(user)) {
    throw new TherapyThoughtError("Not authorized.");
  }
}

async function requireDayPlanOwner(planId: string, userId: string) {
  const plan = await prisma.plan.findFirst({
    where: {
      id: planId,
      userId,
      type: PlanTypeEnum.DAY,
    },
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
  await requireTherapyThoughtAccess(userId);
  await requireDayPlanOwner(planId, userId);

  const thoughts = await prisma.therapyThought.findMany({
    where: { planId, userId },
    select: {
      id: true,
      planId: true,
      body: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return thoughts.map(serializeTherapyThought);
}

export async function getTherapyThoughtCollection(
  userId: string,
  filter: TherapyThoughtCollectionFilter,
): Promise<TherapyThoughtCollectionGroup[]> {
  await requireTherapyThoughtAccess(userId);

  const createdAtFilter =
    filter === "all"
      ? undefined
      : {
          gte: subDays(new Date(), filter === "7d" ? 7 : 30),
        };

  const thoughts = await prisma.therapyThought.findMany({
    where: {
      userId,
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      plan: { type: PlanTypeEnum.DAY },
    },
    select: {
      id: true,
      planId: true,
      body: true,
      createdAt: true,
      plan: {
        select: {
          dateStart: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const groups = new Map<string, TherapyThoughtCollectionGroup>();

  for (const thought of thoughts) {
    const dateString = formatDateString(thought.plan.dateStart);
    const existing = groups.get(dateString);

    const entry: TherapyThoughtCollectionEntry = {
      id: thought.id,
      planId: thought.planId,
      body: thought.body,
      createdAt: thought.createdAt.toISOString(),
    };

    if (existing) {
      existing.thoughts.unshift(entry);
      continue;
    }

    groups.set(dateString, {
      dateString,
      dateLabel: formatDayPlanContextLabel(thought.plan.dateStart),
      thoughts: [entry],
    });
  }

  return Array.from(groups.values()).sort((left, right) =>
    right.dateString.localeCompare(left.dateString),
  );
}

export async function addTherapyThought(
  userId: string,
  body: string,
  planId: string,
) {
  await requireTherapyThoughtAccess(userId);
  await requireDayPlanOwner(planId, userId);

  const trimmed = validateBody(body);

  const thought = await prisma.therapyThought.create({
    data: {
      userId,
      planId,
      body: trimmed,
    },
  });

  await touchPlan(planId);
  await touchUserSeen(userId);

  return {
    planId: thought.planId,
    thought: serializeTherapyThought(thought),
  };
}

export async function updateTherapyThought(
  thoughtId: string,
  userId: string,
  body: string,
) {
  await requireTherapyThoughtAccess(userId);

  const existing = await requireTherapyThoughtOwner(thoughtId, userId);
  const trimmed = validateBody(body);

  const thought = await prisma.therapyThought.update({
    where: { id: thoughtId },
    data: { body: trimmed },
  });

  await touchPlan(existing.planId);
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
  await requireTherapyThoughtAccess(userId);

  const existing = await requireTherapyThoughtOwner(thoughtId, userId);

  await prisma.therapyThought.delete({
    where: { id: thoughtId },
  });

  await touchPlan(existing.planId);
  await touchUserSeen(userId);

  return { planId: existing.planId };
}
