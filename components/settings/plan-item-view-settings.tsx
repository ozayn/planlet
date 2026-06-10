"use client";

import type { PlanItemView } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePlanItemViewAction } from "@/app/(app)/settings/actions";
import { PLAN_ITEM_VIEW_OPTIONS } from "@/lib/plan-item-view";

type PlanItemViewSettingsProps = {
  value: PlanItemView;
};

export function PlanItemViewSettings({ value }: PlanItemViewSettingsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeOption =
    PLAN_ITEM_VIEW_OPTIONS.find((option) => option.value === selected) ??
    PLAN_ITEM_VIEW_OPTIONS[0];

  function handleChange(nextValue: PlanItemView) {
    if (nextValue === selected || isPending) {
      return;
    }

    setError(null);
    setSelected(nextValue);

    startTransition(async () => {
      const result = await updatePlanItemViewAction(nextValue);

      if (!result.success) {
        setSelected(value);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="ui-label">Planning preferences</h2>

      <fieldset className="space-y-2">
        <legend className="sr-only">Plan item view</legend>
        <p className="text-sm font-medium text-foreground">Plan item view</p>

        <div className="flex flex-wrap gap-2">
          {PLAN_ITEM_VIEW_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm transition-colors ${
                selected === option.value ? "ui-segment-active" : "ui-segment"
              }`}
            >
              <input
                type="radio"
                name="plan-item-view"
                value={option.value}
                checked={selected === option.value}
                disabled={isPending}
                onChange={() => handleChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>

        <p className="text-xs text-muted-light">{activeOption.helper}</p>
      </fieldset>

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
