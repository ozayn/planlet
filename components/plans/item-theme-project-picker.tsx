"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import type { SerializedPlanItem } from "@/lib/plan-serialize";
import {
  getAssignmentDisplayLabel,
  type ThemeProjectCatalog,
} from "@/lib/theme-project-types";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ItemThemeProjectPickerProps = {
  planId: string;
  item: SerializedPlanItem;
  catalog: ThemeProjectCatalog;
  canEdit: boolean;
  compact?: boolean;
  emptyOptionLabel?: string;
};

function encodeAssignment(
  themeId: string | null,
  projectId: string | null,
): string {
  if (projectId) {
    return `project:${projectId}`;
  }

  if (themeId) {
    return `theme:${themeId}`;
  }

  return "";
}

function decodeAssignment(value: string): {
  themeId: string | null;
  projectId: string | null;
} {
  if (value.startsWith("project:")) {
    return { themeId: null, projectId: value.slice(8) || null };
  }

  if (value.startsWith("theme:")) {
    return { themeId: value.slice(6) || null, projectId: null };
  }

  return { themeId: null, projectId: null };
}

export function ItemThemeProjectPicker({
  planId,
  item,
  catalog,
  canEdit,
  compact = false,
  emptyOptionLabel = "No theme",
}: ItemThemeProjectPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = getAssignmentDisplayLabel(item);
  const value = encodeAssignment(item.themeId, item.projectId);

  if (!canEdit) {
    if (!label) {
      return null;
    }

    return (
      <span className="max-w-[8rem] truncate text-xs text-muted-light" title={label}>
        {label}
      </span>
    );
  }

  function handleChange(nextValue: string) {
    if (nextValue === value || isPending) {
      return;
    }

    const assignment = decodeAssignment(nextValue);

    startTransition(async () => {
      await updatePlanItemAction({
        planId,
        itemId: item.id,
        themeId: assignment.themeId,
        projectId: assignment.projectId,
      });
      router.refresh();
    });
  }

  return (
    <label className={`inline-flex items-center gap-1 ${compact ? "max-w-[9rem]" : "w-full max-w-xs"}`}>
      <span className="sr-only">Theme or project for {item.title}</span>
      <select
        value={value}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        className={`ui-input truncate text-xs ${
          compact ? "min-h-8 max-w-[9rem] px-2 py-1" : "min-h-10 w-full px-3"
        }`}
        title={label ?? emptyOptionLabel}
        {...passwordManagerSafeControlProps}
      >
        <option value="">{emptyOptionLabel}</option>
        {catalog.themes.length > 0 ? (
          <optgroup label="Themes">
            {catalog.themes.map((theme) => (
              <option key={theme.id} value={`theme:${theme.id}`}>
                {theme.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        {catalog.projects.length > 0 ? (
          <optgroup label="Projects">
            {catalog.projects.map((project) => (
              <option key={project.id} value={`project:${project.id}`}>
                {project.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
}

export function ItemThemeProjectLabel({
  item,
}: {
  item: SerializedPlanItem;
}) {
  const label = getAssignmentDisplayLabel(item);

  if (!label) {
    return null;
  }

  return (
    <span
      className="max-w-[8rem] truncate rounded-md bg-accent-cream/70 px-1.5 py-0.5 text-[0.6875rem] text-muted"
      title={label}
    >
      {label}
    </span>
  );
}
