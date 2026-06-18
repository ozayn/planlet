"use client";

import { useMemo, useTransition } from "react";

import { saveReflectionInfluencesAction } from "@/app/(app)/insights/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  getAllSelectedInfluenceIds,
  getInfluencesByCategory,
  MAX_PRIMARY_INFLUENCES,
  type ReflectionInfluenceId,
  type ReflectionInfluencePreferences,
} from "@/lib/reflection-influences";

type SettingsReflectionLensProps = {
  preferences: ReflectionInfluencePreferences;
};

export function SettingsReflectionLens({
  preferences: initialPreferences,
}: SettingsReflectionLensProps) {
  const [isPending, startTransition] = useTransition();
  const selected = useMemo(
    () => new Set(getAllSelectedInfluenceIds(initialPreferences)),
    [initialPreferences],
  );
  const primary = useMemo(
    () => new Set(initialPreferences.primary),
    [initialPreferences.primary],
  );

  function save(next: ReflectionInfluencePreferences) {
    startTransition(async () => {
      await saveReflectionInfluencesAction(next);
    });
  }

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

  function toggleInfluence(id: ReflectionInfluenceId, checked: boolean) {
    const nextSelected = new Set(selected);
    const nextPrimary = new Set(primary);

    if (checked) {
      nextSelected.add(id);
    } else {
      nextSelected.delete(id);
      nextPrimary.delete(id);
    }

    save(buildPreferences(nextSelected, nextPrimary));
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

    save(buildPreferences(selected, nextPrimary));
  }

  const categories = getInfluencesByCategory();

  return (
    <SettingsSection title="Reflection lens">
      <p className="text-sm text-muted">
        Choose influences that can shape AI reflections. Mark up to{" "}
        {MAX_PRIMARY_INFLUENCES} as primary for stronger emphasis.
      </p>
      <div className="space-y-5">
        {categories.map(({ category, influences }) => (
          <div key={category.id} className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-light">
              {category.label}
            </h3>
            <ul className="space-y-1">
              {influences.map((influence) => {
                const inputId = `reflection-influence-${influence.id}`;
                const isSelected = selected.has(influence.id);
                const isPrimary = primary.has(influence.id);
                const primaryDisabled =
                  !isSelected ||
                  (!isPrimary && primary.size >= MAX_PRIMARY_INFLUENCES);

                return (
                  <li
                    key={influence.id}
                    className="flex min-h-10 items-center justify-between gap-3 rounded-xl px-1"
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
                        disabled={isPending}
                        onChange={(event) =>
                          toggleInfluence(influence.id, event.target.checked)
                        }
                        className="h-4 w-4 rounded border-border text-foreground"
                      />
                      <span>{influence.label}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => togglePrimary(influence.id)}
                      disabled={isPending || primaryDisabled}
                      aria-pressed={isPrimary}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors ${
                        isPrimary
                          ? "bg-foreground text-background"
                          : "bg-accent-cream text-muted hover:text-foreground disabled:opacity-40"
                      }`}
                    >
                      Primary
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {isPending ? (
        <p className="text-xs text-muted-light">Saving…</p>
      ) : null}
    </SettingsSection>
  );
}
