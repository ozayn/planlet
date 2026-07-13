"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  generateCoachingReflectionAction,
  saveReflectionInfluencesAction,
} from "@/app/(app)/coaching/actions";
import { CoachingReflectionFeedback } from "@/components/coaching/coaching-reflection-feedback";
import { ReflectionLensSelector } from "@/components/coaching/reflection-lens-selector";
import {
  canGenerateCoachingReflection,
  formatCoachingReflectionRemainingLabel,
  type CoachingReflectionLimitStatusView,
} from "@/lib/coaching/reflection-limit-ui";
import type { LifeLabReadAloudPreferences } from "@/lib/life-lab/read-aloud-preferences";
import {
  getAllSelectedInfluenceIds,
  type ReflectionInfluencePreferences,
} from "@/lib/reflection-influences";

export type SerializedCoachingReflectionLimitStatus =
  CoachingReflectionLimitStatusView;

type CoachingPageContentProps = {
  initialPreferences: ReflectionInfluencePreferences;
  initialLimitStatus: SerializedCoachingReflectionLimitStatus;
  readAloudPreferences: LifeLabReadAloudPreferences;
  openAiNarrationAvailable: boolean;
};

export function CoachingPageContent({
  initialPreferences,
  initialLimitStatus,
  readAloudPreferences,
  openAiNarrationAvailable,
}: CoachingPageContentProps) {
  const [preferences, setPreferences] =
    useState<ReflectionInfluencePreferences>(initialPreferences);
  const [limitStatus, setLimitStatus] = useState(initialLimitStatus);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [experiment, setExperiment] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isGenerating, startGenerateTransition] = useTransition();

  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  useEffect(() => {
    setLimitStatus(initialLimitStatus);
  }, [initialLimitStatus]);

  const selectedCount = useMemo(
    () => getAllSelectedInfluenceIds(preferences).length,
    [preferences],
  );
  const hasInfluences = selectedCount > 0;
  const canGenerate = canGenerateCoachingReflection(limitStatus);
  const remainingLabel = formatCoachingReflectionRemainingLabel(limitStatus);

  function save(next: ReflectionInfluencePreferences) {
    setSaveError(null);
    setPreferences(next);

    startSaveTransition(async () => {
      const result = await saveReflectionInfluencesAction(next);

      if (!result.success) {
        setPreferences(initialPreferences);
        setSaveError(result.error);
      }
    });
  }

  function handleGenerate() {
    setGenerateError(null);

    startGenerateTransition(async () => {
      const result = await generateCoachingReflectionAction();

      if (!result.success) {
        setReflection(null);
        setQuestion(null);
        setExperiment(null);
        setGenerateError(result.error);
        return;
      }

      setReflection(result.reflection);
      setQuestion(result.question);
      setExperiment(result.experiment);
      setLimitStatus((current) =>
        current.isUnlimited
          ? current
          : {
              ...current,
              used: current.used + 1,
              remaining: Math.max(0, current.remaining - 1),
            },
      );
    });
  }

  return (
    <div className="space-y-5">
      <ReflectionLensSelector
        preferences={preferences}
        isSaving={isSaving}
        saveError={saveError}
        onChange={save}
      />

      <section className="space-y-3">
        {!reflection ? (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Generate thoughtful feedback based on your recent plans, reflections,
              and selected perspectives.
            </p>
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!hasInfluences || !canGenerate || isGenerating}
                  className="ui-btn-secondary ui-btn-compact min-h-10 w-full px-4 sm:w-fit"
                >
                  {isGenerating ? "Generating…" : "Generate feedback"}
                </button>
                <p className="text-xs text-muted">{remainingLabel}</p>
              </div>
              {generateError ? (
                <p className="rounded-lg border border-accent-red/20 px-3 py-2 text-sm text-accent-red">
                  {generateError}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {generateError ? (
              <p className="rounded-lg border border-accent-red/20 px-3 py-2 text-sm text-accent-red">
                {generateError}
              </p>
            ) : null}
            <CoachingReflectionFeedback
              reflection={reflection}
              question={question}
              experiment={experiment}
              isGenerating={isGenerating}
              hasInfluences={hasInfluences}
              canGenerate={canGenerate}
              remainingLabel={remainingLabel}
              readAloudPreferences={readAloudPreferences}
              openAiNarrationAvailable={openAiNarrationAvailable}
              onRegenerate={handleGenerate}
            />
          </>
        )}
      </section>
    </div>
  );
}
