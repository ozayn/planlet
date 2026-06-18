"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { generateCoachingReflectionAction } from "@/app/(app)/insights/actions";
import {
  formatReflectionInfluenceLabels,
  type ReflectionInfluenceId,
} from "@/lib/reflection-influences";

type InsightsReflectionLensProps = {
  selectedInfluences: ReflectionInfluenceId[];
};

export function InsightsReflectionLens({
  selectedInfluences,
}: InsightsReflectionLensProps) {
  const [error, setError] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [experiment, setExperiment] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasInfluences = selectedInfluences.length > 0;

  function handleGenerate() {
    setError(null);

    startTransition(async () => {
      const result = await generateCoachingReflectionAction();

      if (!result.success) {
        setReflection(null);
        setQuestion(null);
        setExperiment(null);
        setError(result.error);
        return;
      }

      setReflection(result.reflection);
      setQuestion(result.question);
      setExperiment(result.experiment);
    });
  }

  return (
    <section className="ui-insights-section">
      <h2 className="ui-insights-heading">Reflection lens</h2>
      {hasInfluences ? (
        <p className="text-sm text-muted">
          Selected influences:{" "}
          <span className="text-foreground">
            {formatReflectionInfluenceLabels(selectedInfluences)}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted">
          Choose reflection influences in{" "}
          <Link href="/settings" className="ui-text-link">
            Settings
          </Link>
          .
        </p>
      )}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!hasInfluences || isPending}
        className="ui-btn-secondary ui-btn-compact min-h-10 w-fit px-4"
      >
        {isPending ? "Generating…" : "Generate reflection"}
      </button>
      {error ? (
        <p className="rounded-xl border border-accent-red/20 bg-accent-cream px-3 py-2 text-sm text-accent-red">
          {error}
        </p>
      ) : null}
      {reflection ? (
        <div className="space-y-3 text-sm text-foreground">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
              Reflection
            </p>
            <p className="mt-1 leading-relaxed" dir="auto">
              {reflection}
            </p>
          </div>
          {question ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
                Question
              </p>
              <p className="mt-1 leading-relaxed" dir="auto">
                {question}
              </p>
            </div>
          ) : null}
          {experiment ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-light">
                Small experiment
              </p>
              <p className="mt-1 leading-relaxed" dir="auto">
                {experiment}
              </p>
            </div>
          ) : null}
          <p className="text-xs text-muted-light">
            This is a reflective prompt, not therapy or medical advice.
          </p>
        </div>
      ) : null}
    </section>
  );
}
