import type { UserAccess } from "@/lib/roles";

import type { SerializedGratitude } from "@/lib/gratitude";
import { getGratitudesForPlan } from "@/lib/gratitude";
import type { SerializedObservation } from "@/lib/observations";
import { getObservationsForPlan } from "@/lib/observations";
import { canUseReflectionFeatures } from "@/lib/roles";

export type PlanReflectionData = {
  observations: SerializedObservation[] | undefined;
  gratitudes: SerializedGratitude[] | undefined;
};

export async function getPlanReflectionData(
  planId: string,
  userId: string,
  access: UserAccess,
): Promise<PlanReflectionData> {
  if (!canUseReflectionFeatures(access)) {
    return { observations: undefined, gratitudes: undefined };
  }

  const [observations, gratitudes] = await Promise.all([
    getObservationsForPlan(planId, userId),
    getGratitudesForPlan(planId, userId),
  ]);

  return { observations, gratitudes };
}
