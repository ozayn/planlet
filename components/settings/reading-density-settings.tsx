"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateReadingDensityAction } from "@/app/(app)/settings/actions";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  READING_DENSITY_OPTIONS,
  type ReadingDensityValue,
} from "@/lib/reading-density";

type ReadingDensitySettingsProps = {
  value: ReadingDensityValue;
  embedded?: boolean;
};

export function ReadingDensitySettings({
  value,
  embedded = false,
}: ReadingDensitySettingsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextValue: ReadingDensityValue) {
    if (nextValue === selected || isPending) {
      return;
    }

    setError(null);
    setSelected(nextValue);

    startTransition(async () => {
      const result = await updateReadingDensityAction(nextValue);

      if (!result.success) {
        setSelected(value);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const fieldset = (
    <fieldset className="ui-settings-fieldset">
      <legend className="sr-only">Reading density</legend>
      {!embedded ? (
        <p className="text-sm font-medium text-foreground">Reading density</p>
      ) : null}

      <div className="space-y-2">
        {READING_DENSITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
              selected === option.value
                ? "border-border bg-accent-cream/30"
                : "border-border/70"
            } ${isPending ? "opacity-80" : ""}`}
          >
            <input
              id={`reading-density-${option.value}`}
              type="radio"
              name="reading-density"
              value={option.value}
              checked={selected === option.value}
              disabled={isPending}
              onChange={() => handleChange(option.value)}
              className="mt-1"
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="block text-xs leading-relaxed text-muted">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );

  if (embedded) {
    return fieldset;
  }

  return <SettingsSection title="Reading & Display">{fieldset}</SettingsSection>;
}
