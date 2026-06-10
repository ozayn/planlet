"use server";

import type { PlanItemView } from "@/app/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { updatePlanItemView } from "@/lib/user-preferences";

const PLAN_ITEM_VIEWS = new Set<PlanItemView>(["MINIMAL", "CHECKLIST"]);

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidatePlanSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/plans", "layout");
  revalidatePath("/dashboard");
}

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string };

export async function updatePlanItemViewAction(
  value: PlanItemView,
): Promise<SettingsActionResult> {
  if (!PLAN_ITEM_VIEWS.has(value)) {
    return { success: false, error: "Invalid plan item view." };
  }

  try {
    const userId = await requireUserId();
    await updatePlanItemView(userId, value);
    revalidatePlanSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update plan item view.",
    };
  }
}
