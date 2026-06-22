"use client";

import type { PlanItemView } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePlanItemViewAction } from "@/app/(app)/settings/actions";
import { PlanItemStatusVisual } from "@/components/plans/plan-item-status-visual";
import {
  isExpressiveItemView,
  PLAN_ITEM_VIEW_OPTIONS,
} from "@/lib/plan-item-view";
import { getStatusIcon } from "@/lib/plan-status";

type PlanItemViewSettingsProps = {
  value: PlanItemView;
};

export function PlanItemViewSettings({ value }: PlanItemViewSettingsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    <>
      <fieldset className="ui-settings-fieldset">
        <legend className="sr-only">Item style</legend>
        <p className="text-sm font-medium text-foreground">Item style</p>

        <div className="flex flex-wrap gap-1.5">
          {PLAN_ITEM_VIEW_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm transition-colors ${
                selected === option.value ? "ui-segment-active" : "ui-segment"
              }`}
            >
              <input
                id={`plan-item-view-${option.value}`}
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

        {isExpressiveItemView(selected) ? (
          <p className="text-xs text-muted-light">
            Expressive uses visible status marks.
          </p>
        ) : null}

        <p className="flex flex-wrap items-center gap-3 text-xs text-muted-light">
          {isExpressiveItemView(selected) ? (
            <>
              <span>{getStatusIcon("OPEN")} Open</span>
              <span aria-hidden="true">·</span>
              <span>{getStatusIcon("DONE")} Done</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <PlanItemStatusVisual
                  status="OPEN"
                  itemView="MINIMAL"
                  className="h-3.5 w-3.5"
                />
                Open
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <PlanItemStatusVisual
                  status="DONE"
                  itemView="MINIMAL"
                  className="h-3.5 w-3.5"
                />
                Done
              </span>
            </>
          )}
        </p>
      </fieldset>

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
