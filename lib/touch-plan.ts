import { prisma } from "@/lib/prisma";

/**
 * Bumps Plan.updatedAt so recent activity can be read cheaply from the plan row.
 */
export async function touchPlan(planId: string) {
  return prisma.plan.update({
    where: { id: planId },
    data: { updatedAt: new Date() },
    select: { id: true, updatedAt: true },
  });
}

export async function getPlanRecentActivityMap(
  planIds: string[],
): Promise<Map<string, Date>> {
  if (planIds.length === 0) {
    return new Map();
  }

  const plans = await prisma.plan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, updatedAt: true },
  });

  return new Map(
    plans.map((plan) => [plan.id, plan.updatedAt]),
  );
}
