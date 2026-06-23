"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  generateCoachingReflectionAction,
  saveReflectionInfluencesAction,
} from "@/app/(app)/coaching/actions";
import { CoachingReflectionFeedback } from "@/components/coaching/coaching-reflection-feedback";
import { ReflectionLensSelector } from "@/components/coaching/reflection-lens-selector";
import {
  formatReflectionInfluenceLabels,
  getAllSelectedInfluenceIds,
  type ReflectionInfluencePreferences,
} from "@/lib/reflection-influences";

type CoachingPageContentProps = {
  initialPreferences: ReflectionInfluencePreferences;
};

export function CoachingPageContent({
  initialPreferences,
}: CoachingPageContentProps) {
  const [preferences, setPreferences] =
    useState<ReflectionInfluencePreferences>(initialPreferences);
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

  const selectedCount = useMemo(
    () => getAllSelectedInfluenceIds(preferences).length,
    [preferences],
  );
  const hasInfluences = selectedCount > 0;
  const selectedLabels = formatReflectionInfluenceLabels(preferences);

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
    });
  }

  return (
    <div className="space-y-10">
      <ReflectionLensSelector
        preferences={preferences}
        isSaving={isSaving}
        saveError={saveError}
        onChange={save}
      />

      <section className="space-y-5 border-t border-border-soft pt-8">
        {hasInfluences ? (
          <p className="text-sm leading-relaxed text-muted">
            Drawing on{" "}
            <span className="text-foreground">{selectedLabels}</span>.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Select at least one perspective above to generate feedback.
          </p>
        )}

        {!reflection ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!hasInfluences || isGenerating}
              className="ui-btn-secondary ui-btn-compact min-h-10 w-fit px-4"
            >
              {isGenerating ? "Generating…" : "Generate reflection"}
            </button>
            {generateError ? (
              <p className="rounded-lg border border-accent-red/20 px-3 py-2 text-sm text-accent-red">
                {generateError}
              </p>
            ) : null}
          </div>
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
              onRegenerate={handleGenerate}
            />
          </>
        )}
      </section>
    </div>
  );
}
