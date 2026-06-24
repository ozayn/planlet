"use client";

type CoachingReflectionFeedbackProps = {
  reflection: string;
  question: string | null;
  experiment: string | null;
  isGenerating: boolean;
  hasInfluences: boolean;
  canGenerate: boolean;
  remainingLabel: string;
  onRegenerate: () => void;
};

export function CoachingReflectionFeedback({
  reflection,
  question,
  experiment,
  isGenerating,
  hasInfluences,
  canGenerate,
  remainingLabel,
  onRegenerate,
}: CoachingReflectionFeedbackProps) {
  return (
    <section className="space-y-5" aria-live="polite">
      <div className="space-y-5 border-s-2 border-border-soft ps-5">
        <p className="text-sm font-medium text-foreground">Teacher feedback</p>

        <section className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-light">
            Reflection
          </h3>
          <p
            className="text-[0.9375rem] leading-[1.75] text-foreground"
            dir="auto"
          >
            {reflection}
          </p>
        </section>

        {question ? (
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-light">
              Question for you
            </h3>
            <p
              className="text-[0.9375rem] leading-[1.75] text-foreground"
              dir="auto"
            >
              {question}
            </p>
          </section>
        ) : null}

        {experiment ? (
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-light">
              Small experiment
            </h3>
            <p
              className="text-[0.9375rem] leading-[1.75] text-foreground"
              dir="auto"
            >
              {experiment}
            </p>
          </section>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!hasInfluences || !canGenerate || isGenerating}
            className="ui-btn-secondary ui-btn-compact min-h-10 w-fit px-4"
          >
            {isGenerating ? "Generating…" : "Regenerate feedback"}
          </button>
          <p className="text-xs text-muted">{remainingLabel}</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-light">
          AI-generated reflection. Not therapy, coaching, or medical advice.
        </p>
      </div>
    </section>
  );
}
