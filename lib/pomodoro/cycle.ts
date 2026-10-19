import type {
  PomodoroPhase,
  PomodoroPreferences,
} from "@/lib/pomodoro/constants";

export function phaseLabel(phase: PomodoroPhase): string {
  switch (phase) {
    case "focus":
      return "Focus";
    case "short_break":
      return "Short break";
    case "long_break":
      return "Long break";
  }
}

export function isBreakPhase(phase: PomodoroPhase): boolean {
  return phase === "short_break" || phase === "long_break";
}

export function durationSecondsForPhase(
  phase: PomodoroPhase,
  preferences: Pick<
    PomodoroPreferences,
    "focusDurationSeconds" | "shortBreakSeconds" | "longBreakSeconds"
  >,
): number {
  switch (phase) {
    case "focus":
      return preferences.focusDurationSeconds;
    case "short_break":
      return preferences.shortBreakSeconds;
    case "long_break":
      return preferences.longBreakSeconds;
  }
}

/**
 * After a completed focus session, choose the next break type.
 * Long break when completedFocusCount is a multiple of sessionsBeforeLongBreak.
 */
export function nextBreakPhaseAfterFocus(input: {
  completedFocusCount: number;
  sessionsBeforeLongBreak: number;
}): PomodoroPhase {
  const before = Math.max(1, Math.floor(input.sessionsBeforeLongBreak));
  const completed = Math.max(0, Math.floor(input.completedFocusCount));

  if (completed > 0 && completed % before === 0) {
    return "long_break";
  }

  return "short_break";
}

/**
 * After a break ends, advance to the next focus index.
 * Long break resets the cycle to focus 1 with completedFocusCount 0.
 */
export function nextFocusStateAfterBreak(input: {
  phase: PomodoroPhase;
  focusIndex: number;
  completedFocusCount: number;
  sessionsBeforeLongBreak: number;
}): {
  focusIndex: number;
  completedFocusCount: number;
} {
  if (input.phase === "long_break") {
    return {
      focusIndex: 1,
      completedFocusCount: 0,
    };
  }

  const nextIndex = Math.min(
    input.focusIndex + 1,
    Math.max(1, input.sessionsBeforeLongBreak),
  );

  return {
    focusIndex: nextIndex,
    completedFocusCount: input.completedFocusCount,
  };
}

export function cycleDotsState(input: {
  sessionsBeforeLongBreak: number;
  completedFocusCount: number;
  phase: PomodoroPhase;
  status: string;
}): { filled: number; total: number; activeIndex: number | null } {
  const total = Math.max(1, Math.floor(input.sessionsBeforeLongBreak));
  const completed = Math.min(total, Math.max(0, input.completedFocusCount));

  if (input.phase === "focus" && input.status !== "awaiting_next") {
    return {
      filled: completed,
      total,
      activeIndex: Math.min(total, completed + 1),
    };
  }

  return {
    filled: completed,
    total,
    activeIndex: null,
  };
}
