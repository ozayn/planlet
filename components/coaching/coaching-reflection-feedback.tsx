"use client";

type CoachingReflectionFeedbackProps = {
  reflection: string;
  question: string | null;
  experiment: string | null;
  isGenerating: boolean;
  hasInfluences: boolean;
  onRegenerate: () => void;
};

export function CoachingReflectionFeedback({
  reflection,
  question,
  experiment,
  isGenerating,
  hasInfluences,
  onRegenerate,
}: CoachingReflectionFeedbackProps) {
  return (
    <section className="space-y-4" aria-live="polite">
      <article className="space-y-6 rounded-xl border border-border-soft bg-surface px-5 py-6 sm:px-6">
        <header className="border-b border-border-soft pb-4">
          <p className="text-sm text-muted">
            Reflection from your selected perspectives
          </p>
        </header>

        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Reflection</h3>
            <p
              className="text-[0.9375rem] leading-[1.7] text-foreground"
              dir="auto"
            >
              {reflection}
            </p>
          </section>

          {question ? (
            <section className="space-y-2 border-t border-border-soft pt-6">
              <h3 className="text-sm font-medium text-foreground">
                Question for you
              </h3>
              <p
                className="text-[0.9375rem] leading-[1.7] text-foreground"
                dir="auto"
              >
                {question}
              </p>
            </section>
          ) : null}

          {experiment ? (
            <section className="space-y-2 border-t border-border-soft pt-6">
              <h3 className="text-sm font-medium text-foreground">
                Suggested experiment or next step
              </h3>
              <p
                className="text-[0.9375rem] leading-[1.7] text-foreground"
                dir="auto"
              >
                {experiment}
              </p>
            </section>
          ) : null}
        </div>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={!hasInfluences || isGenerating}
          className="ui-btn-secondary ui-btn-compact min-h-10 w-fit px-4"
        >
          {isGenerating ? "Generating…" : "Regenerate reflection"}
        </button>
        <p className="text-xs leading-relaxed text-muted-light">
          AI-generated reflection. Not therapy, coaching, or medical advice.
        </p>
      </div>
    </section>
  );
}
