import { prisma } from "@/lib/prisma";
import type {
  SerializedProject,
  SerializedTheme,
  ThemeProjectCatalog,
} from "@/lib/theme-project-types";

export type {
  SerializedProject,
  SerializedTheme,
  ThemeProjectCatalog,
} from "@/lib/theme-project-types";
export {
  EMPTY_THEME_PROJECT_CATALOG,
  getAssignmentLabel,
} from "@/lib/theme-project-types";

function serializeTheme(theme: {
  id: string;
  name: string;
  color: string | null;
  isArchived: boolean;
}): SerializedTheme {
  return {
    id: theme.id,
    name: theme.name,
    color: theme.color,
    isArchived: theme.isArchived,
  };
}

function serializeProject(project: {
  id: string;
  name: string;
  themeId: string | null;
  isArchived: boolean;
  theme: { name: string } | null;
}): SerializedProject {
  return {
    id: project.id,
    name: project.name,
    themeId: project.themeId,
    themeName: project.theme?.name ?? null,
    isArchived: project.isArchived,
  };
}

export async function getThemeProjectCatalog(
  userId: string,
  options?: { includeArchived?: boolean },
): Promise<ThemeProjectCatalog> {
  const includeArchived = options?.includeArchived ?? false;
  const archiveFilter = includeArchived ? {} : { isArchived: false };

  const [themes, projects] = await Promise.all([
    prisma.theme.findMany({
      where: { userId, ...archiveFilter },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        isArchived: true,
      },
    }),
    prisma.project.findMany({
      where: { userId, ...archiveFilter },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        themeId: true,
        isArchived: true,
        theme: { select: { name: true } },
      },
    }),
  ]);

  return {
    themes: themes.map(serializeTheme),
    projects: projects.map(serializeProject),
  };
}

export async function createTheme(
  userId: string,
  input: { name: string; color?: string | null },
): Promise<SerializedTheme> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Theme name is required.");
  }

  const theme = await prisma.theme.create({
    data: {
      userId,
      name,
      color: input.color?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      color: true,
      isArchived: true,
    },
  });

  return serializeTheme(theme);
}

export async function updateTheme(
  userId: string,
  themeId: string,
  input: { name?: string; color?: string | null; isArchived?: boolean },
): Promise<SerializedTheme> {
  const existing = await prisma.theme.findFirst({
    where: { id: themeId, userId },
  });

  if (!existing) {
    throw new Error("Theme not found.");
  }

  const theme = await prisma.theme.update({
    where: { id: themeId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.color !== undefined
        ? { color: input.color?.trim() || null }
        : {}),
      ...(input.isArchived !== undefined
        ? { isArchived: input.isArchived }
        : {}),
    },
    select: {
      id: true,
      name: true,
      color: true,
      isArchived: true,
    },
  });

  return serializeTheme(theme);
}

export async function deleteTheme(userId: string, themeId: string): Promise<void> {
  const existing = await prisma.theme.findFirst({
    where: { id: themeId, userId },
  });

  if (!existing) {
    throw new Error("Theme not found.");
  }

  await prisma.$transaction([
    prisma.planItem.updateMany({
      where: { themeId },
      data: { themeId: null },
    }),
    prisma.project.updateMany({
      where: { themeId },
      data: { themeId: null },
    }),
    prisma.theme.delete({ where: { id: themeId } }),
  ]);
}

export async function createProject(
  userId: string,
  input: { name: string; themeId?: string | null },
): Promise<SerializedProject> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Project name is required.");
  }

  if (input.themeId) {
    const theme = await prisma.theme.findFirst({
      where: { id: input.themeId, userId },
    });

    if (!theme) {
      throw new Error("Theme not found.");
    }
  }

  const project = await prisma.project.create({
    data: {
      userId,
      name,
      themeId: input.themeId ?? null,
    },
    select: {
      id: true,
      name: true,
      themeId: true,
      isArchived: true,
      theme: { select: { name: true } },
    },
  });

  return serializeProject(project);
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: { name?: string; themeId?: string | null; isArchived?: boolean },
): Promise<SerializedProject> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!existing) {
    throw new Error("Project not found.");
  }

  if (input.themeId) {
    const theme = await prisma.theme.findFirst({
      where: { id: input.themeId, userId },
    });

    if (!theme) {
      throw new Error("Theme not found.");
    }
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.themeId !== undefined ? { themeId: input.themeId } : {}),
      ...(input.isArchived !== undefined
        ? { isArchived: input.isArchived }
        : {}),
    },
    select: {
      id: true,
      name: true,
      themeId: true,
      isArchived: true,
      theme: { select: { name: true } },
    },
  });

  return serializeProject(project);
}

export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<void> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!existing) {
    throw new Error("Project not found.");
  }

  await prisma.$transaction([
    prisma.planItem.updateMany({
      where: { projectId },
      data: { projectId: null },
    }),
    prisma.project.delete({ where: { id: projectId } }),
  ]);
}

export async function validatePlanItemAssignment(
  userId: string,
  themeId: string | null | undefined,
  projectId: string | null | undefined,
): Promise<{ themeId: string | null; projectId: string | null }> {
  let resolvedThemeId = themeId ?? null;
  let resolvedProjectId = projectId ?? null;

  if (resolvedThemeId) {
    const theme = await prisma.theme.findFirst({
      where: { id: resolvedThemeId, userId, isArchived: false },
    });

    if (!theme) {
      throw new Error("Theme not found.");
    }
  }

  if (resolvedProjectId) {
    const project = await prisma.project.findFirst({
      where: { id: resolvedProjectId, userId, isArchived: false },
      select: { id: true, themeId: true },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.themeId) {
      resolvedThemeId = project.themeId;
    }
  }

  return {
    themeId: resolvedThemeId,
    projectId: resolvedProjectId,
  };
}
