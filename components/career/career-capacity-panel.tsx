"use client";

import type { CareerPracticeMode } from "@/app/generated/prisma/client";
import {
  CAPACITY_OPTIONS,
  SAFETY_OPTIONS,
  suggestedModesForCapacity,
  type CareerCapacity,
  type EmotionalSafety,
  type TodayCapacityState,
} from "@/lib/career-journey/capacity";
import { CAREER_MODE_META } from "@/lib/career-journey/modes";

type CareerCapacityPanelProps = {
  state: TodayCapacityState;
  onChange: (state: TodayCapacityState) => void;
};

export function CareerCapacityPanel({
  state,
  onChange,
}: CareerCapacityPanelProps) {
  const suggestedModes = suggestedModesForCapacity(state.capacity, state.safety);

  return (
    <section className="ui-card-padded space-y-4 border border-border-soft">
      <div>
        <h2 className="text-base font-medium text-foreground">
          Today&apos;s capacity
        </h2>
        <p className="mt-1 text-sm text-muted">
          Enough for today — suggestions will match your energy.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Today&apos;s capacity</legend>
        <div className="flex flex-wrap gap-2">
          {CAPACITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                state.capacity === option.value
                  ? "border-accent/50 bg-accent-cream/70 text-foreground"
                  : "border-border-soft text-foreground hover:bg-accent-cream/40"
              }`}
            >
              <input
                type="radio"
                name="career-capacity"
                value={option.value}
                checked={state.capacity === option.value}
                onChange={() =>
                  onChange({ ...state, capacity: option.value as CareerCapacity })
                }
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">
          {CAPACITY_OPTIONS.find((o) => o.value === state.capacity)?.hint}
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm text-muted">
          What feels emotionally safe today?{" "}
          <span className="text-xs">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SAFETY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                state.safety === option.value
                  ? "border-accent/50 bg-accent-cream/70 text-foreground"
                  : "border-border-soft text-foreground hover:bg-accent-cream/40"
              }`}
            >
              <input
                type="radio"
                name="career-safety"
                value={option.value}
                checked={state.safety === option.value}
                onChange={() =>
                  onChange({
                    ...state,
                    safety: option.value as EmotionalSafety,
                  })
                }
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
          {state.safety ? (
            <button
              type="button"
              className="rounded-full border border-border-soft px-3 py-1.5 text-sm text-muted hover:text-foreground"
              onClick={() => onChange({ ...state, safety: null })}
            >
              Clear
            </button>
          ) : null}
        </div>
      </fieldset>

      <p className="text-xs text-muted">
        Suggested session sizes:{" "}
        {suggestedModes
          .map((mode: CareerPracticeMode) => CAREER_MODE_META[mode].label)
          .join(" · ")}
      </p>
    </section>
  );
}
