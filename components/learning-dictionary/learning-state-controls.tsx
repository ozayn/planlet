"use client";

type LearningStateControlsProps = {
  disabled?: boolean;
  onNotYet: () => void;
  onLearning: () => void;
  onKnow: () => void;
};

export function LearningStateControls({
  disabled = false,
  onNotYet,
  onLearning,
  onKnow,
}: LearningStateControlsProps) {
  return (
    <div
      className="grid grid-cols-3 gap-2"
      data-dictionary-learning-controls=""
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onNotYet}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/70 px-2 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground disabled:opacity-50"
      >
        Not yet
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onLearning}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/70 px-2 text-sm font-medium text-muted transition-colors hover:bg-accent-cream/40 hover:text-foreground disabled:opacity-50"
      >
        Learning
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onKnow}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/70 bg-accent-cream/50 px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-cream/80 disabled:opacity-50"
      >
        I know this
      </button>
    </div>
  );
}
