import type { ThemeProjectCatalog } from "@/lib/theme-project-types";

export type ThemeProjectSuggestion = {
  themeId: string | null;
  projectId: string | null;
  themeName: string | null;
  projectName: string | null;
};

type KeywordRule = {
  pattern: RegExp;
  themeName?: string;
  projectName?: string;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    pattern: /\b(apply|application|interview|resume|cv|job hunt|freddie mac|message josh)\b/i,
    themeName: "Career",
    projectName: "Job Hunt",
  },
  {
    pattern: /\b(batch|url|expo\s*print|contract)\b/i,
    themeName: "Career",
    projectName: "ExpoPrint Contract",
  },
  {
    pattern: /\b(planlet)\b/i,
    themeName: "Career",
    projectName: "Planlet",
  },
  {
    pattern: /\b(tatreez|club)\b/i,
    themeName: "Community",
    projectName: "Tatreez",
  },
  {
    pattern: /\b(yoga|workout|run|walk|health|doctor|gym|meditation)\b/i,
    themeName: "Health",
  },
  {
    pattern: /\b(clean|laundry|dishes|home|repair|groceries)\b/i,
    themeName: "Home",
  },
  {
    pattern: /\b(read|study|course|learn|class)\b/i,
    themeName: "Learning",
  },
  {
    pattern: /\b(write|paint|draw|music|creative|design)\b/i,
    themeName: "Creativity",
  },
  {
    pattern: /\b(journal|reflect|therapy|meditate|inner)\b/i,
    themeName: "Inner Work",
  },
  {
    pattern: /\b(email|invoice|tax|admin|paperwork|schedule)\b/i,
    themeName: "Admin",
  },
  {
    pattern: /\b(call|date|friend|family|partner|relationship)\b/i,
    themeName: "Relationships",
  },
];

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function findThemeByName(
  catalog: ThemeProjectCatalog,
  name: string,
): ThemeProjectCatalog["themes"][number] | null {
  const normalized = normalizeName(name);
  return (
    catalog.themes.find((theme) => normalizeName(theme.name) === normalized) ??
    null
  );
}

function findProjectByName(
  catalog: ThemeProjectCatalog,
  name: string,
): ThemeProjectCatalog["projects"][number] | null {
  const normalized = normalizeName(name);
  return (
    catalog.projects.find(
      (project) => normalizeName(project.name) === normalized,
    ) ?? null
  );
}

function findProjectInTitle(
  catalog: ThemeProjectCatalog,
  title: string,
): ThemeProjectCatalog["projects"][number] | null {
  const normalizedTitle = normalizeName(title);
  const matches = catalog.projects.filter((project) =>
    normalizedTitle.includes(normalizeName(project.name)),
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => b.name.length - a.name.length)[0];
}

function findThemeInTitle(
  catalog: ThemeProjectCatalog,
  title: string,
): ThemeProjectCatalog["themes"][number] | null {
  const normalizedTitle = normalizeName(title);
  const matches = catalog.themes.filter((theme) =>
    normalizedTitle.includes(normalizeName(theme.name)),
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => b.name.length - a.name.length)[0];
}

export function suggestThemeProjectForTitle(
  title: string,
  catalog: ThemeProjectCatalog,
): ThemeProjectSuggestion {
  const trimmed = title.trim();
  if (!trimmed) {
    return {
      themeId: null,
      projectId: null,
      themeName: null,
      projectName: null,
    };
  }

  const projectFromTitle = findProjectInTitle(catalog, trimmed);
  const themeFromTitle = findThemeInTitle(catalog, trimmed);

  let themeName = themeFromTitle?.name ?? null;
  let projectName = projectFromTitle?.name ?? null;

  if (!themeName && !projectName) {
    for (const rule of KEYWORD_RULES) {
      if (!rule.pattern.test(trimmed)) {
        continue;
      }

      themeName = themeName ?? rule.themeName ?? null;
      projectName = projectName ?? rule.projectName ?? null;
      break;
    }
  }

  const project =
    projectFromTitle ??
    (projectName ? findProjectByName(catalog, projectName) : null);
  const themeFromProject =
    project?.themeId != null
      ? (catalog.themes.find((theme) => theme.id === project.themeId) ?? null)
      : null;
  const theme =
    themeFromTitle ??
    themeFromProject ??
    (themeName ? findThemeByName(catalog, themeName) : null);

  return {
    themeId: theme?.id ?? project?.themeId ?? null,
    projectId: project?.id ?? null,
    themeName: theme?.name ?? themeName,
    projectName: project?.name ?? projectName,
  };
}
