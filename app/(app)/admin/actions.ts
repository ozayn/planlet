"use server";

import { revalidatePath } from "next/cache";

import {
  AppSettingError,
  updateCoachingReflectionWeeklyLimit,
} from "@/lib/app-settings";
import { requireAdminUser } from "@/lib/admin-stats";

export type AdminSettingActionResult =
  | { success: true; limit: number }
  | { success: false; error: string };

export async function updateCoachingReflectionWeeklyLimitAction(
  limit: number,
): Promise<AdminSettingActionResult> {
  try {
    await requireAdminUser();
    const saved = await updateCoachingReflectionWeeklyLimit(limit);
    revalidatePath("/admin");
    revalidatePath("/coaching");
    return { success: true, limit: saved };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof AppSettingError
          ? error.message
          : "Failed to save setting.",
    };
  }
}
