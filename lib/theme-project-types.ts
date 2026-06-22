export type SerializedTheme = {
  id: string;
  name: string;
  color: string | null;
  isArchived: boolean;
};

export type SerializedProject = {
  id: string;
  name: string;
  themeId: string | null;
  themeName: string | null;
  isArchived: boolean;
};

export type ThemeProjectCatalog = {
  themes: SerializedTheme[];
  projects: SerializedProject[];
};

export const EMPTY_THEME_PROJECT_CATALOG: ThemeProjectCatalog = {
  themes: [],
  projects: [],
};

export function getAssignmentLabel(item: {
  projectName?: string | null;
  themeName?: string | null;
}): string | null {
  return getAssignmentDisplayLabel(item);
}

export function getAssignmentDisplayLabel(item: {
  projectName?: string | null;
  themeName?: string | null;
}): string | null {
  const theme = item.themeName?.trim();
  const project = item.projectName?.trim();

  if (theme && project) {
    return `${theme} · ${project}`;
  }

  return project ?? theme ?? null;
}

export function hasThemeProjectAssignment(item: {
  themeId?: string | null;
  projectId?: string | null;
  themeName?: string | null;
  projectName?: string | null;
}): boolean {
  return Boolean(
    item.themeId ||
      item.projectId ||
      item.themeName?.trim() ||
      item.projectName?.trim(),
  );
}
