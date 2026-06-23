"use client";

import { useMemo, useState } from "react";

import { ChevronDownIcon } from "@/components/ui/action-icons";
import {
  getAllSelectedInfluenceIds,
  getInfluencesByCategory,
  MAX_PRIMARY_INFLUENCES,
  type ReflectionInfluenceCategoryId,
  type ReflectionInfluenceId,
  type ReflectionInfluencePreferences,
} from "@/lib/reflection-influences";

type ReflectionLensSelectorProps = {
  preferences: ReflectionInfluencePreferences;
  isSaving: boolean;
  saveError: string | null;
  onChange: (next: ReflectionInfluencePreferences) => void;
};

function buildPreferences(
  nextSelected: Set<ReflectionInfluenceId>,
  nextPrimary: Set<ReflectionInfluenceId>,
): ReflectionInfluencePreferences {
  const primaryIds = [...nextPrimary]
    .filter((id) => nextSelected.has(id))
    .slice(0, MAX_PRIMARY_INFLUENCES);
  const primarySet = new Set(primaryIds);
  const secondary = [...nextSelected].filter((id) => !primarySet.has(id));

  return { primary: primaryIds, secondary };
}

export function ReflectionLensSelector({
  preferences,
  isSaving,
  saveError,
  onChange,
}: ReflectionLensSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<
    Set<ReflectionInfluenceCategoryId>
  >(() => new Set());

  const selected = useMemo(
    () => new Set(getAllSelectedInfluenceIds(preferences)),
    [preferences],
  );
  const primary = useMemo(
    () => new Set(preferences.primary),
    [preferences.primary],
  );
  const selectedCount = selected.size;
  const categories = getInfluencesByCategory();

  function toggleCategory(categoryId: ReflectionInfluenceCategoryId) {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  function toggleInfluence(id: ReflectionInfluenceId, checked: boolean) {
    const nextSelected = new Set(selected);
    const nextPrimary = new Set(primary);

    if (checked) {
      nextSelected.add(id);
    } else {
      nextSelected.delete(id);
      nextPrimary.delete(id);
    }

    onChange(buildPreferences(nextSelected, nextPrimary));
  }

  function togglePrimary(id: ReflectionInfluenceId) {
    if (!selected.has(id)) {
      return;
    }

    const nextPrimary = new Set(primary);

    if (nextPrimary.has(id)) {
      nextPrimary.delete(id);
    } else if (nextPrimary.size < MAX_PRIMARY_INFLUENCES) {
      nextPrimary.add(id);
    } else {
      return;
    }

    onChange(buildPreferences(selected, nextPrimary));
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-medium text-foreground">Reflection lens</h2>
        <p className="text-sm leading-relaxed text-muted">
          Choose the perspectives you want Planlet to consider. Mark up to{" "}
          {MAX_PRIMARY_INFLUENCES} as primary for stronger emphasis.
        </p>
      </div>

      <p className="text-sm text-foreground">
        <span className="font-medium tabular-nums">{selectedCount}</span>{" "}
        {selectedCount === 1 ? "perspective" : "perspectives"} selected
      </p>

      <div className="divide-y divide-border-soft rounded-xl border border-border-soft">
        {categories.map(({ category, influences }) => {
          const categorySelectedCount = influences.filter((influence) =>
            selected.has(influence.id),
          ).length;
          const isExpanded = expandedCategories.has(category.id);
          const panelId = `coaching-category-${category.id}`;

          return (
            <div key={category.id}>
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => toggleCategory(category.id)}
                className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-accent-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
              >
                <span className="text-sm font-medium text-foreground">
                  {category.label}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-muted">
                  {categorySelectedCount > 0 ? (
                    <span className="text-xs tabular-nums text-muted">
                      {categorySelectedCount} selected
                    </span>
                  ) : null}
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </span>
              </button>

              {isExpanded ? (
                <div id={panelId} className="space-y-0.5 px-3 pb-3">
                  <ul className="space-y-0.5">
                    {influences.map((influence) => {
                      const inputId = `coaching-influence-${influence.id}`;
                      const isSelected = selected.has(influence.id);
                      const isPrimary = primary.has(influence.id);
                      const primaryDisabled =
                        !isSelected ||
                        (!isPrimary && primary.size >= MAX_PRIMARY_INFLUENCES);

                      return (
                        <li
                          key={influence.id}
                          className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-1"
                        >
                          <label
                            htmlFor={inputId}
                            className="flex min-h-10 flex-1 cursor-pointer items-center gap-3 text-sm text-foreground"
                          >
                            <input
                              id={inputId}
                              name="reflectionInfluences"
                              type="checkbox"
                              checked={isSelected}
                              disabled={isSaving}
                              onChange={(event) =>
                                toggleInfluence(
                                  influence.id,
                                  event.target.checked,
                                )
                              }
                              className="h-4 w-4 rounded border-border text-foreground"
                            />
                            <span>{influence.label}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => togglePrimary(influence.id)}
                            disabled={isSaving || primaryDisabled}
                            aria-pressed={isPrimary}
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-xs transition-colors ${
                              isPrimary
                                ? "border-foreground bg-foreground text-background"
                                : "border-border-soft text-muted hover:border-border hover:text-foreground disabled:opacity-40"
                            }`}
                          >
                            Primary
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isSaving ? (
        <p className="text-xs text-muted-light">Saving…</p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-accent-red/20 px-3 py-2 text-sm text-accent-red">
          {saveError}
        </p>
      ) : null}
    </section>
  );
}
