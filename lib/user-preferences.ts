import type { PlanItemView } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getPlanItemViewForUser(
  userId: string,
): Promise<PlanItemView> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planItemView: true },
  });

  return user?.planItemView ?? "MINIMAL";
}

export async function updatePlanItemView(
  userId: string,
  planItemView: PlanItemView,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { planItemView },
  });
}
