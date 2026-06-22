"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/require-auth";
import {
  createProject,
  createTheme,
  deleteProject,
  deleteTheme,
  getThemeProjectCatalog,
  updateProject,
  updateTheme,
} from "@/lib/themes-projects";

export type ThemesActionResult =
  | { success: true }
  | { success: false; error: string };

function revalidateThemeSurfaces() {
  revalidatePath("/themes");
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/plans", "layout");
  revalidatePath("/insights");
}

export async function getThemeProjectCatalogAction() {
  const userId = await requireUserId();
  return getThemeProjectCatalog(userId);
}

export async function createThemeAction(input: {
  name: string;
  color?: string | null;
}): Promise<ThemesActionResult> {
  try {
    const userId = await requireUserId();
    await createTheme(userId, input);
    revalidateThemeSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create theme.",
    };
  }
}

export async function updateThemeAction(input: {
  themeId: string;
  name?: string;
  color?: string | null;
  isArchived?: boolean;
}): Promise<ThemesActionResult> {
  try {
    const userId = await requireUserId();
    await updateTheme(userId, input.themeId, input);
    revalidateThemeSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update theme.",
    };
  }
}

export async function deleteThemeAction(
  themeId: string,
): Promise<ThemesActionResult> {
  try {
    const userId = await requireUserId();
    await deleteTheme(userId, themeId);
    revalidateThemeSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete theme.",
    };
  }
}

export async function createProjectAction(input: {
  name: string;
  themeId?: string | null;
}): Promise<ThemesActionResult> {
  try {
    const userId = await requireUserId();
    await createProject(userId, input);
    revalidateThemeSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project.",
    };
  }
}

export async function updateProjectAction(input: {
  projectId: string;
  name?: string;
  themeId?: string | null;
  isArchived?: boolean;
}): Promise<ThemesActionResult> {
  try {
    const userId = await requireUserId();
    await updateProject(userId, input.projectId, input);
    revalidateThemeSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update project.",
    };
  }
}

export async function deleteProjectAction(
  projectId: string,
): Promise<ThemesActionResult> {
  try {
    const userId = await requireUserId();
    await deleteProject(userId, projectId);
    revalidateThemeSurfaces();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete project.",
    };
  }
}
