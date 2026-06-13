import type { UserAccess } from "@/lib/roles";

import type { SerializedGratitude } from "@/lib/gratitude";
import { getGratitudesForPlan } from "@/lib/gratitude";
import type { SerializedObservation } from "@/lib/observations";
import { getObservationsForPlan } from "@/lib/observations";
import type { SerializedTherapyThought } from "@/lib/therapy-thoughts";
import { getTherapyThoughtsForPlan } from "@/lib/therapy-thoughts";
import {
  canUseReflectionFeatures,
  canUseTherapyThoughts,
} from "@/lib/roles";

export type PlanReflectionData = {
  observations: SerializedObservation[] | undefined;
  gratitudes: SerializedGratitude[] | undefined;
  therapyThoughts: SerializedTherapyThought[] | undefined;
};

export async function getPlanReflectionData(
  planId: string,
  userId: string,
  access: UserAccess,
): Promise<PlanReflectionData> {
  const hasReflection = canUseReflectionFeatures(access);
  const hasTherapyThoughts = canUseTherapyThoughts(access);

  if (!hasReflection && !hasTherapyThoughts) {
    return {
      observations: undefined,
      gratitudes: undefined,
      therapyThoughts: undefined,
    };
  }

  const [observations, gratitudes, therapyThoughts] = await Promise.all([
    hasReflection
      ? getObservationsForPlan(planId, userId)
      : Promise.resolve(undefined),
    hasReflection
      ? getGratitudesForPlan(planId, userId)
      : Promise.resolve(undefined),
    hasTherapyThoughts
      ? getTherapyThoughtsForPlan(planId, userId)
      : Promise.resolve(undefined),
  ]);

  return { observations, gratitudes, therapyThoughts };
}
