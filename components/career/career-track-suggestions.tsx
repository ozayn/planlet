"use client";

import { useMemo, useState } from "react";

import type { CareerPracticeMode } from "@/app/generated/prisma/client";
import { createCareerSessionAndAddToTodayAction } from "@/app/(app)/career/actions";
import type { TodayCapacityState } from "@/lib/career-journey/capacity";
import { suggestedModesForCapacity } from "@/lib/career-journey/capacity";
import { CAREER_MODE_META } from "@/lib/career-journey/modes";
import {
  filterSuggestionsForCapacity,
  resolveSuggestionMode,
  TECHNICAL_PREP_GROUPS,
  TRACK_SUGGESTION_GROUPS,
  type CareerSuggestion,
} from "@/lib/career-journey/suggestions";

type CareerTrackSuggestionsProps = {
  todayDate: string;
  capacityState: TodayCapacityState;
  isPending: boolean;
  onError: (message: string) => void;
  onSuccess: () => void;
};

function SuggestionRow({
  suggestion,
  defaultMode,
  allowedModes,
  isPending,
  onAdd,
}: {
  suggestion: CareerSuggestion;
  defaultMode: CareerPracticeMode;
  allowedModes: CareerPracticeMode[];
  isPending: boolean;
  onAdd: (mode: CareerPracticeMode) => void;
}) {
  const [selectedMode, setSelectedMode] = useState(defaultMode);

  return (
    <div className="rounded-xl border border-border-soft/70 p-3">
      <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {allowedModes.map((mode) => {
          const meta = CAREER_MODE_META[mode];
          return (
            <label
              key={mode}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                selectedMode === mode
                  ? "border-accent/50 bg-accent-cream/70 text-foreground"
                  : "border-border-soft text-muted hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name={`mode-${suggestion.id}`}
                value={mode}
                checked={selectedMode === mode}
                onChange={() => setSelectedMode(mode)}
                className="sr-only"
              />
              {meta.label} ({meta.minutes})
            </label>
          );
        })}
        <button
          type="button"
          className="ui-btn-secondary ui-btn-compact ml-auto"
          disabled={isPending}
          onClick={() => onAdd(selectedMode)}
        >
          Add to today
        </button>
      </div>
    </div>
  );
}

export function CareerTrackSuggestions({
  todayDate,
  capacityState,
  isPending,
  onError,
  onSuccess,
}: CareerTrackSuggestionsProps) {
  const allowedModes = useMemo(
    () =>
      suggestedModesForCapacity(
        capacityState.capacity,
        capacityState.safety,
      ),
    [capacityState],
  );

  const trackGroups = useMemo(
    () =>
      filterSuggestionsForCapacity(
        TRACK_SUGGESTION_GROUPS.filter(
          (g) => !TECHNICAL_PREP_GROUPS.some((t) => t.id === g.id),
        ),
        capacityState.capacity,
        capacityState.safety,
      ),
    [capacityState],
  );

  const technicalGroups = useMemo(
    () =>
      filterSuggestionsForCapacity(
        TECHNICAL_PREP_GROUPS,
        capacityState.capacity,
        capacityState.safety,
      ),
    [capacityState],
  );

  async function handleAdd(suggestion: CareerSuggestion, mode: CareerPracticeMode) {
    const result = await createCareerSessionAndAddToTodayAction({
      type: suggestion.type,
      mode,
      title: suggestion.title,
      date: todayDate,
    });

    if (!result.success) {
      onError(result.error ?? "Something went wrong.");
      return;
    }

    onSuccess();
  }

  return (
    <section className="ui-card-padded space-y-5 border border-border-soft">
      <div>
        <h2 className="text-base font-medium text-foreground">
          Next kind actions
        </h2>
        <p className="mt-1 text-sm text-muted">
          Parallel tracks — pick one tiny step and protect your energy.
        </p>
      </div>

      {trackGroups.map((group) => (
        <div key={group.id} className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{group.label}</h3>
          <div className="space-y-2">
            {group.suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.id}
                suggestion={suggestion}
                defaultMode={resolveSuggestionMode(
                  suggestion,
                  capacityState.capacity,
                  capacityState.safety,
                )}
                allowedModes={allowedModes}
                isPending={isPending}
                onAdd={(mode) => handleAdd(suggestion, mode)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-3 border-t border-border-soft/60 pt-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Technical prep</h3>
          <p className="mt-0.5 text-xs text-muted">
            LeetCode, interview questions, and ML/DS — gentle return welcome.
          </p>
        </div>
        {technicalGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted">
              {group.label}
            </h4>
            <div className="space-y-2">
              {group.suggestions.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.id}
                  suggestion={suggestion}
                  defaultMode={resolveSuggestionMode(
                    suggestion,
                    capacityState.capacity,
                    capacityState.safety,
                  )}
                  allowedModes={allowedModes}
                  isPending={isPending}
                  onAdd={(mode) => handleAdd(suggestion, mode)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
