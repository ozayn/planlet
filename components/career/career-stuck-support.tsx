"use client";

import type { CareerPracticeMode, CareerPracticeType } from "@/app/generated/prisma/client";
import {
  createCareerSessionAndAddToTodayAction,
  generateCareerReflectionAction,
  pauseCareerPillarAction,
} from "@/app/(app)/career/actions";
import {
  findStuckPatterns,
  stuckSupportReadTitle,
  stuckSupportSmallerTitle,
  stuckSupportTenMinuteTitle,
  type StuckPattern,
} from "@/lib/career-journey/stuck-support";
import type { SerializedCareerSession } from "@/lib/career-journey/career-journey";

type CareerStuckSupportProps = {
  todayDate: string;
  recentSessions: SerializedCareerSession[];
  isPending: boolean;
  onError: (message: string) => void;
  onSuccess: () => void;
  onReflection: (reflection: string, nextKindAction: string) => void;
};

export function CareerStuckSupport({
  todayDate,
  recentSessions,
  isPending,
  onError,
  onSuccess,
  onReflection,
}: CareerStuckSupportProps) {
  const patterns = findStuckPatterns(recentSessions, todayDate);

  if (patterns.length === 0) {
    return null;
  }

  return (
    <section className="ui-card-padded space-y-4 border border-border-soft bg-surface-muted/20">
      {patterns.map((pattern) => (
        <StuckPatternCard
          key={pattern.type}
          pattern={pattern}
          todayDate={todayDate}
          isPending={isPending}
          onError={onError}
          onSuccess={onSuccess}
          onReflection={onReflection}
        />
      ))}
    </section>
  );
}

function StuckPatternCard({
  pattern,
  todayDate,
  isPending,
  onError,
  onSuccess,
  onReflection,
}: {
  pattern: StuckPattern;
  todayDate: string;
  isPending: boolean;
  onError: (message: string) => void;
  onSuccess: () => void;
  onReflection: (reflection: string, nextKindAction: string) => void;
}) {
  async function addSession(
    type: CareerPracticeType,
    mode: CareerPracticeMode,
    title: string,
  ) {
    const result = await createCareerSessionAndAddToTodayAction({
      type,
      mode,
      title,
      date: todayDate,
    });

    if (!result.success) {
      onError(result.error ?? "Something went wrong.");
      return;
    }

    onSuccess();
  }

  async function handlePause() {
    const result = await pauseCareerPillarAction(pattern.pillarName);
    if (!result.success) {
      onError(result.error ?? "Something went wrong.");
      return;
    }
    onSuccess();
  }

  async function handleReflection() {
    const result = await generateCareerReflectionAction();
    if (!result.success) {
      onError(result.error);
      return;
    }
    onReflection(result.reflection, result.nextKindAction);
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-medium text-foreground">
          Gentle return — {pattern.label}
        </h2>
        <p className="mt-1 text-sm text-muted">
          This has been hard to return to. That happens — no failure here.
        </p>
      </div>

      <p className="text-xs text-muted">
        Skipped or moved {pattern.totalHard} times recently — would you like to:
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ui-btn-secondary ui-btn-compact"
          disabled={isPending}
          onClick={() =>
            addSession(
              pattern.type,
              "TINY",
              stuckSupportSmallerTitle(pattern.label),
            )
          }
        >
          Make it smaller
        </button>
        <button
          type="button"
          className="ui-btn-secondary ui-btn-compact"
          disabled={isPending}
          onClick={() =>
            addSession(
              pattern.type,
              "TINY",
              stuckSupportReadTitle(pattern.label),
            )
          }
        >
          Read instead of solve
        </button>
        <button
          type="button"
          className="ui-btn-secondary ui-btn-compact"
          disabled={isPending}
          onClick={() =>
            addSession(
              pattern.type,
              "TINY",
              stuckSupportTenMinuteTitle(pattern.label),
            )
          }
        >
          10-minute version
        </button>
        <button
          type="button"
          className="ui-btn-secondary ui-btn-compact"
          disabled={isPending}
          onClick={handlePause}
        >
          Pause for this week
        </button>
        <button
          type="button"
          className="ui-btn-secondary ui-btn-compact"
          disabled={isPending}
          onClick={handleReflection}
        >
          Ask for a gentle reflection
        </button>
      </div>
    </div>
  );
}
