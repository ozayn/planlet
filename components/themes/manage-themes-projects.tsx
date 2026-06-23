"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createProjectAction,
  createThemeAction,
  updateProjectAction,
  updateThemeAction,
} from "@/app/(app)/themes/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import { SUGGESTED_THEME_NAMES } from "@/lib/theme-project-constants";
import type { ThemeProjectCatalog } from "@/lib/theme-project-types";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ManageThemesProjectsProps = {
  catalog: ThemeProjectCatalog;
};

export function ManageThemesProjects({ catalog }: ManageThemesProjectsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newThemeName, setNewThemeName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectThemeId, setNewProjectThemeId] = useState("");

  const activeThemes = catalog.themes.filter((theme) => !theme.isArchived);
  const activeProjects = catalog.projects.filter(
    (project) => !project.isArchived,
  );

  function refreshAfter(action: Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action;
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  function handleCreateTheme(name: string) {
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    setNewThemeName("");
    refreshAfter(createThemeAction({ name: trimmed }));
  }

  function handleCreateProject() {
    const trimmed = newProjectName.trim();
    if (!trimmed || isPending) return;
    refreshAfter(
      createProjectAction({
        name: trimmed,
        themeId: newProjectThemeId || null,
      }),
    );
    setNewProjectName("");
    setNewProjectThemeId("");
  }

  return (
    <div className="space-y-5">
      <SettingsSection title="Themes">
        <p className="text-sm text-muted">
          Broad life areas for organizing tasks.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_THEME_NAMES.map((name) => {
            const exists = activeThemes.some(
              (theme) => theme.name.toLowerCase() === name.toLowerCase(),
            );
            if (exists) return null;

            return (
              <button
                key={name}
                type="button"
                disabled={isPending}
                onClick={() => handleCreateTheme(name)}
                className="ui-segment min-h-9 px-3 text-sm"
              >
                + {name}
              </button>
            );
          })}
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateTheme(newThemeName);
          }}
        >
          <input
            id="new-theme-name"
            name="new-theme-name"
            type="text"
            value={newThemeName}
            onChange={(event) => setNewThemeName(event.target.value)}
            placeholder="New theme name"
            disabled={isPending}
            className="ui-input min-h-10 flex-1 px-3 text-sm"
            {...passwordManagerSafeControlProps}
          />
          <button type="submit" disabled={isPending} className="ui-btn-secondary">
            Add theme
          </button>
        </form>

        {activeThemes.length > 0 ? (
          <ul className="space-y-2">
            {activeThemes.map((theme) => (
              <li
                key={theme.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-soft px-3 py-2 text-sm"
              >
                <span>{theme.name}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    refreshAfter(
                      updateThemeAction({
                        themeId: theme.id,
                        isArchived: true,
                      }),
                    )
                  }
                  className="ui-text-link text-xs"
                >
                  Archive
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ui-empty-state space-y-3">
            <p className="text-sm text-muted">No themes yet.</p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const input = document.getElementById("new-theme-name");
                input?.focus();
              }}
              className="ui-btn-secondary text-sm"
            >
              Create first theme
            </button>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Projects">
        <p className="text-sm text-muted">
          Specific ongoing efforts. A project can belong to a theme.
        </p>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateProject();
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="new-project-name"
              name="new-project-name"
              type="text"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="New project name"
              disabled={isPending}
              className="ui-input min-h-10 flex-1 px-3 text-sm"
              {...passwordManagerSafeControlProps}
            />
            <select
              id="new-project-theme"
              name="new-project-theme"
              value={newProjectThemeId}
              onChange={(event) => setNewProjectThemeId(event.target.value)}
              disabled={isPending}
              className="ui-input min-h-10 px-3 text-sm"
              {...passwordManagerSafeControlProps}
            >
              <option value="">No theme</option>
              {activeThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={isPending} className="ui-btn-secondary">
            Add project
          </button>
        </form>

        {activeProjects.length > 0 ? (
          <ul className="space-y-2">
            {activeProjects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-soft px-3 py-2 text-sm"
              >
                <span>
                  {project.name}
                  {project.themeName ? (
                    <span className="text-muted-light"> · {project.themeName}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    refreshAfter(
                      updateProjectAction({
                        projectId: project.id,
                        isArchived: true,
                      }),
                    )
                  }
                  className="ui-text-link text-xs"
                >
                  Archive
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No projects yet.</p>
        )}
      </SettingsSection>

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
