"use client";

type DictionaryStudySummaryProps = {
  total: number;
  known: number;
  learning: number;
  onContinue: () => void;
  onDone: () => void;
};

export function DictionaryStudySummary({
  total,
  known,
  learning,
  onContinue,
  onDone,
}: DictionaryStudySummaryProps) {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border/60 bg-surface px-5 py-8 text-center"
      data-dictionary-study-summary=""
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Session complete
        </h2>
        <p className="text-sm text-muted">
          You reviewed {total} {total === 1 ? "concept" : "concepts"}.
        </p>
      </div>

      <dl className="grid w-full grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-accent-cream/40 px-3 py-2.5">
          <dt className="text-muted">Known</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {known}
          </dd>
        </div>
        <div className="rounded-xl bg-accent-cream/40 px-3 py-2.5">
          <dt className="text-muted">Still learning</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {learning}
          </dd>
        </div>
      </dl>

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border/70 px-4 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground"
        >
          Done
        </button>
      </div>
    </div>
  );
}
