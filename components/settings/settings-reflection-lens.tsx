"use client";

import { useTransition } from "react";

import { saveReflectionInfluencesAction } from "@/app/(app)/insights/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  REFLECTION_INFLUENCE_IDS,
  REFLECTION_INFLUENCES,
  type ReflectionInfluenceId,
} from "@/lib/reflection-influences";

type SettingsReflectionLensProps = {
  selectedInfluences: ReflectionInfluenceId[];
};

export function SettingsReflectionLens({
  selectedInfluences,
}: SettingsReflectionLensProps) {
  const [isPending, startTransition] = useTransition();
  const selected = new Set(selectedInfluences);

  function toggleInfluence(id: ReflectionInfluenceId, checked: boolean) {
    const next = checked
      ? [...selectedInfluences, id]
      : selectedInfluences.filter((value) => value !== id);

    startTransition(async () => {
      await saveReflectionInfluencesAction(next);
    });
  }

  return (
    <SettingsSection title="Reflection lens">
      <p className="text-sm text-muted">
        Choose influences that can shape AI reflections.
      </p>
      <ul className="space-y-2">
        {REFLECTION_INFLUENCE_IDS.map((id) => {
          const influence = REFLECTION_INFLUENCES[id];
          const inputId = `reflection-influence-${id}`;

          return (
            <li key={id}>
              <label
                htmlFor={inputId}
                className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm text-foreground"
              >
                <input
                  id={inputId}
                  name="reflectionInfluences"
                  type="checkbox"
                  checked={selected.has(id)}
                  disabled={isPending}
                  onChange={(event) =>
                    toggleInfluence(id, event.target.checked)
                  }
                  className="h-4 w-4 rounded border-border text-foreground"
                />
                <span>{influence.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {isPending ? (
        <p className="text-xs text-muted-light">Saving…</p>
      ) : null}
    </SettingsSection>
  );
}
