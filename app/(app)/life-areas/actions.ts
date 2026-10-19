"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  archiveLifeArea,
  createLifeArea,
  ensureDefaultLifeAreas,
  LifeAreaError,
  renameLifeArea,
  reorderLifeAreas,
  restoreLifeArea,
  setPlanItemLifeAreas,
  setPlanItemPrimaryLifeArea,
  updatePlanOrganizeView,
  type PlanOrganizeViewValue,
} from "@/lib/life-areas";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

function revalidatePlans() {
  revalidatePath("/today");
  revalidatePath("/plans");
  revalidatePath("/life-areas");
  revalidatePath("/settings/planner");
}

export async function listLifeAreasAction(includeArchived = true) {
  try {
    const userId = await requireUserId();
    const areas = await ensureDefaultLifeAreas(userId);
    return {
      success: true as const,
      areas: includeArchived
        ? areas
        : areas.filter((area) => !area.archivedAt),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not load Life Areas.",
    };
  }
}

export async function createLifeAreaAction(name: string) {
  try {
    const userId = await requireUserId();
    const area = await createLifeArea(userId, name);
    revalidatePlans();
    return { success: true as const, area };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof LifeAreaError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not add Life Area.",
    };
  }
}

export async function renameLifeAreaAction(lifeAreaId: string, name: string) {
  try {
    const userId = await requireUserId();
    const area = await renameLifeArea(userId, lifeAreaId, name);
    revalidatePlans();
    return { success: true as const, area };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof LifeAreaError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not rename Life Area.",
    };
  }
}

export async function archiveLifeAreaAction(lifeAreaId: string) {
  try {
    const userId = await requireUserId();
    const area = await archiveLifeArea(userId, lifeAreaId);
    revalidatePlans();
    return { success: true as const, area };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof LifeAreaError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not archive Life Area.",
    };
  }
}

export async function restoreLifeAreaAction(lifeAreaId: string) {
  try {
    const userId = await requireUserId();
    const area = await restoreLifeArea(userId, lifeAreaId);
    revalidatePlans();
    return { success: true as const, area };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof LifeAreaError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not restore Life Area.",
    };
  }
}

export async function reorderLifeAreasAction(orderedIds: string[]) {
  try {
    const userId = await requireUserId();
    const areas = await reorderLifeAreas(userId, orderedIds);
    revalidatePlans();
    return { success: true as const, areas };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof LifeAreaError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not reorder Life Areas.",
    };
  }
}

export async function updatePlanOrganizeViewAction(view: PlanOrganizeViewValue) {
  try {
    const userId = await requireUserId();
    const next = await updatePlanOrganizeView(userId, view);
    revalidatePlans();
    return { success: true as const, view: next };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Could not save view preference.",
    };
  }
}

export async function setPlanItemLifeAreasAction(input: {
  planId: string;
  itemId: string;
  primaryLifeAreaId: string | null;
  secondaryLifeAreaIds: string[];
}) {
  try {
    const userId = await requireUserId();
    await setPlanItemLifeAreas({
      userId,
      planItemId: input.itemId,
      primaryLifeAreaId: input.primaryLifeAreaId,
      secondaryLifeAreaIds: input.secondaryLifeAreaIds,
    });
    revalidatePath(`/plans/${input.planId}`);
    revalidatePlans();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof LifeAreaError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not update Life Areas.",
    };
  }
}

/** Change or clear primary only; preserves secondary Life Areas. */
export async function setPlanItemPrimaryLifeAreaAction(input: {
  planId: string;
  itemId: string;
  primaryLifeAreaId: string | null;
}) {
  try {
    const userId = await requireUserId();
    await setPlanItemPrimaryLifeArea({
      userId,
      planItemId: input.itemId,
      primaryLifeAreaId: input.primaryLifeAreaId,
    });
    revalidatePath(`/plans/${input.planId}`);
    revalidatePlans();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof LifeAreaError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not update Life Area.",
    };
  }
}
