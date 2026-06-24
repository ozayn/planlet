"use client";

import { useState } from "react";

import { saveCareerWeeklyReviewAction } from "@/app/(app)/career/actions";
import type { SerializedWeeklyReview } from "@/lib/career-journey/career-journey";
import { isWeeklyReviewWindow } from "@/lib/career-journey/weekly-balance";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type CareerWeeklyReviewProps = {
  weekStart: string;
  todayDate: string;
  initialReview: SerializedWeeklyReview | null;
  isPending: boolean;
  onError: (message: string) => void;
};

const PROMPTS = [
  { key: "gaveEnergy" as const, label: "What gave energy?" },
  { key: "drainedEnergy" as const, label: "What drained energy?" },
  { key: "roleFeltAlive" as const, label: "Which role felt most alive?" },
  { key: "nextStep" as const, label: "What is one enough-sized step for next week?" },
];

export function CareerWeeklyReview({
  weekStart,
  todayDate,
  initialReview,
  isPending,
  onError,
}: CareerWeeklyReviewProps) {
  const [open, setOpen] = useState(isWeeklyReviewWindow(todayDate));
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState({
    gaveEnergy: initialReview?.gaveEnergy ?? "",
    drainedEnergy: initialReview?.drainedEnergy ?? "",
    roleFeltAlive: initialReview?.roleFeltAlive ?? "",
    nextStep: initialReview?.nextStep ?? "",
  });

  async function handleSave() {
    const result = await saveCareerWeeklyReviewAction({
      weekStart,
      gaveEnergy: values.gaveEnergy,
      drainedEnergy: values.drainedEnergy,
      roleFeltAlive: values.roleFeltAlive,
      nextStep: values.nextStep,
    });

    if (!result.success) {
      onError(result.error ?? "Something went wrong.");
      return;
    }

    setSaved(true);
  }

  return (
    <section className="ui-card-padded space-y-4 border border-border-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-foreground">
            Weekly review
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isWeeklyReviewWindow(todayDate)
              ? "End of week — enough reflection, no grades."
              : "Optional anytime — protect energy, notice what helped."}
          </p>
        </div>
        <button
          type="button"
          className="ui-btn-ghost ui-btn-compact shrink-0"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open ? (
        <div className="space-y-3">
          {PROMPTS.map((prompt) => (
            <label key={prompt.key} className="block space-y-1.5">
              <span className="text-sm text-foreground">{prompt.label}</span>
              <textarea
                id={`career-weekly-${prompt.key}`}
                name={`careerWeekly${prompt.key}`}
                value={values[prompt.key]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [prompt.key]: event.target.value,
                  }))
                }
                rows={2}
                className="ui-input w-full resize-y"
                {...passwordManagerSafeControlProps}
              />
            </label>
          ))}
          <button
            type="button"
            className="ui-btn-primary"
            disabled={isPending}
            onClick={handleSave}
          >
            Save weekly review
          </button>
          {saved ? (
            <p className="text-sm text-muted">Saved — gentle return anytime.</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-muted">
        Gentle nudges can be added later.
      </p>
    </section>
  );
}
