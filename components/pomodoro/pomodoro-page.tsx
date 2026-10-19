"use client";

import Link from "next/link";
import {
  Maximize2,
  Minimize2,
  Settings2,
  SkipForward,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  adjustPomodoroRemainingAction,
  completePomodoroPhaseAction,
  pausePomodoroAction,
  reconcilePomodoroAction,
  resumePomodoroAction,
  skipPomodoroBreakAction,
  startPomodoroBreakAction,
  startPomodoroFocusAction,
  stopPomodoroAction,
  updatePomodoroAssociationAction,
} from "@/app/(app)/pomodoro/actions";
import { ActivityTimerRing } from "@/components/activity-timer/activity-timer-ring";
import { useActivityTimerClock } from "@/components/activity-timer/use-activity-timer-clock";
import { VoiceTextField } from "@/components/audio/voice-text-field";
import { InfoIcon } from "@/components/ui/action-icons";
import { DurationMinutesInput } from "@/components/ui/duration-minutes-input";
import { formatActivityClock, formatActivityDuration } from "@/lib/activity-timer/format";
import {
  POMODORO_COMPACT_STORAGE_KEY,
  POMODORO_SETTINGS_PATH,
  type PomodoroActivityOption,
  type PomodoroPageData,
  type PomodoroPreferences,
  type PomodoroTaskOption,
  type SerializedPomodoroActiveRun,
} from "@/lib/pomodoro/constants";
import { cycleDotsState, isBreakPhase, phaseLabel } from "@/lib/pomodoro/cycle";
import {
  playPomodoroCompletionFeedback,
  warmPomodoroCompletionAudio,
} from "@/lib/pomodoro/feedback";
import { formatPomodoroFocusedSummary } from "@/lib/pomodoro/format";
import { showPomodoroPhaseNotification } from "@/lib/pomodoro/notifications";
import { secondsToMinutes } from "@/lib/pomodoro/preferences";
import { partitionPomodoroTaskOptions } from "@/lib/pomodoro/today-task-options";

type PomodoroPageProps = {
  data: PomodoroPageData;
};

function selectionKeyFromState(input: {
  taskId: string;
  customTitle: string;
  activities: PomodoroActivityOption[];
}): string {
  if (input.taskId) {
    return `task:${input.taskId}`;
  }
  const custom = input.customTitle.trim();
  if (!custom) {
    return "";
  }
  const activity = input.activities.find(
    (item) => item.title.trim() === custom,
  );
  return activity ? `activity:${activity.id}` : "";
}

function resolveWorkingOnLabel(input: {
  run: SerializedPomodoroActiveRun | null;
  customDraft: string;
  taskId: string;
  taskOptions: PomodoroTaskOption[];
}): string | null {
  const id = input.taskId || input.run?.taskId;
  if (id) {
    const task = input.taskOptions.find((option) => option.id === id);
    if (task?.title.trim()) {
      return task.title.trim();
    }
    if (task?.missing) {
      return "Unavailable task";
    }
  }

  const custom = input.customDraft.trim() || input.run?.customTitle?.trim();
  return custom || null;
}

function AdjustTimePopover({
  open,
  customMinutes,
  pending,
  onClose,
  onCustomMinutesChange,
  onAdjustDelta,
  onApplyCustom,
}: {
  open: boolean;
  customMinutes: string;
  pending: boolean;
  onClose: () => void;
  onCustomMinutesChange: (value: string) => void;
  onAdjustDelta: (deltaSeconds: number) => void;
  onApplyCustom: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setShowCustom(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !dialogRef.current) {
      return;
    }
    const first = dialogRef.current.querySelector<HTMLElement>(
      "button:not([disabled]), input:not([disabled])",
    );
    first?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="ui-pomodoro-adjust-popover w-full max-w-sm space-y-2 px-1"
      role="dialog"
      aria-modal="true"
      aria-label="Adjust remaining time"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          className="ui-btn-secondary min-h-11 px-3 text-sm"
          disabled={pending}
          onClick={() => onAdjustDelta(-5 * 60)}
        >
          −5 min
        </button>
        <button
          type="button"
          className="ui-btn-secondary min-h-11 px-3 text-sm"
          disabled={pending}
          onClick={() => onAdjustDelta(5 * 60)}
        >
          +5 min
        </button>
        <button
          type="button"
          className="ui-btn-secondary min-h-11 px-3 text-sm"
          disabled={pending}
          aria-pressed={showCustom}
          onClick={() => setShowCustom((current) => !current)}
        >
          Custom
        </button>
      </div>
      {showCustom ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <DurationMinutesInput
            value={customMinutes}
            min={0}
            max={180}
            disabled={pending}
            aria-label="Remaining minutes"
            onChange={onCustomMinutesChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApplyCustom();
              }
            }}
          />
          <button
            type="button"
            className="ui-btn-primary min-h-11 px-3 text-sm"
            disabled={pending || customMinutes.trim() === ""}
            onClick={onApplyCustom}
          >
            Set
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HeaderIconButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const className =
    "ui-btn-ghost inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground";

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TodayTaskPicker({
  taskId,
  customTitle,
  taskOptions,
  activities,
  showCompleted,
  onShowCompletedChange,
  onSelectNone,
  onSelectTask,
  onSelectActivity,
  onCustomTitleChange,
  onCustomTitleApplied,
  onClear,
  onDone,
}: {
  taskId: string;
  customTitle: string;
  taskOptions: PomodoroTaskOption[];
  activities: PomodoroActivityOption[];
  showCompleted: boolean;
  onShowCompletedChange: (next: boolean) => void;
  onSelectNone: () => void;
  onSelectTask: (id: string) => void;
  onSelectActivity: (title: string) => void;
  onCustomTitleChange: (value: string) => void;
  onCustomTitleApplied: () => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const { incomplete, completed } = partitionPomodoroTaskOptions(taskOptions);
  const selectedCompleted =
    Boolean(taskId) && completed.some((task) => task.id === taskId);
  const visibleCompleted =
    showCompleted || selectedCompleted
      ? completed
      : completed.filter((task) => task.id === taskId);
  const hasVisibleTasks =
    incomplete.length > 0 || visibleCompleted.length > 0 || activities.length > 0;

  return (
    <div className="w-full space-y-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Working on
        </p>
        <button
          type="button"
          className="text-xs text-muted transition-colors hover:text-foreground"
          onClick={onDone}
        >
          Done
        </button>
      </div>

      {hasVisibleTasks ? (
        <select
          className="ui-input w-full"
          value={selectionKeyFromState({
            taskId,
            customTitle,
            activities,
          })}
          onChange={(event) => {
            const value = event.target.value;
            if (!value) {
              onSelectNone();
              return;
            }
            if (value.startsWith("task:")) {
              onSelectTask(value.slice("task:".length));
              return;
            }
            if (value.startsWith("activity:")) {
              const id = value.slice("activity:".length);
              const activity = activities.find((item) => item.id === id);
              onSelectActivity(activity?.title ?? "");
            }
          }}
        >
          <option value="">None</option>
          {incomplete.length > 0 ? (
            <optgroup label="Today">
              {incomplete.map((task) => (
                <option key={task.id} value={`task:${task.id}`}>
                  {task.title}
                </option>
              ))}
            </optgroup>
          ) : null}
          {visibleCompleted.length > 0 ? (
            <optgroup label="Completed">
              {visibleCompleted.map((task) => (
                <option key={task.id} value={`task:${task.id}`}>
                  {task.title}
                </option>
              ))}
            </optgroup>
          ) : null}
          {activities.length > 0 ? (
            <optgroup label="Favorites">
              {activities.map((activity) => (
                <option key={activity.id} value={`activity:${activity.id}`}>
                  {activity.title}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      ) : (
        <p className="text-sm text-muted">
          {completed.length > 0
            ? "No incomplete tasks in today&apos;s plan."
            : "No tasks in today&apos;s plan."}
        </p>
      )}

      {completed.length > 0 ? (
        <button
          type="button"
          className="text-xs text-muted transition-colors hover:text-foreground"
          onClick={() => onShowCompletedChange(!showCompleted)}
          aria-pressed={showCompleted}
        >
          {showCompleted ? "Hide completed" : "Show completed"}
        </button>
      ) : null}

      <VoiceTextField
        id="pomodoro-custom-title"
        label="Custom title"
        value={customTitle}
        onChange={onCustomTitleChange}
        placeholder="Optional"
        transcriptMode="replace"
        onTranscriptApplied={onCustomTitleApplied}
      />

      {taskId || customTitle.trim() ? (
        <button
          type="button"
          className="text-xs text-muted transition-colors hover:text-foreground"
          onClick={onClear}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function formatMinutesLabel(seconds: number): string {
  const minutes = secondsToMinutes(seconds);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

function HowPomodoroWorks({ preferences }: { preferences: PomodoroPreferences }) {
  const focusLabel = formatMinutesLabel(preferences.focusDurationSeconds);
  const shortBreakLabel = formatMinutesLabel(preferences.shortBreakSeconds);
  const longBreakMinutes = secondsToMinutes(preferences.longBreakSeconds);
  const sessions = preferences.sessionsBeforeLongBreak;
  const sessionsLabel =
    sessions === 1 ? "one focus session" : `${sessions} focus sessions`;

  return (
    <details className="ui-settings-details group !rounded-none !border-x-0 !border-b-0 !border-t !border-border-soft !bg-transparent">
      <summary className="ui-settings-details-summary !flex !items-center !gap-1.5 !px-0 !py-3 !text-sm !font-medium !normal-case !tracking-normal !text-muted">
        <InfoIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
        How Pomodoro works
      </summary>
      <div className="ui-settings-details-body !gap-3 !border-0 !px-0 !pb-1 !pt-0 text-sm leading-relaxed text-muted">
        <p>
          The Pomodoro Technique divides work into focused sessions separated by
          short breaks.
        </p>
        <p>
          <span className="font-medium text-foreground">Focus</span>
          {" — "}
          {focusLabel} of concentrated work.
        </p>
        <p>
          <span className="font-medium text-foreground">Short break</span>
          {" — "}
          {shortBreakLabel} of rest.
        </p>
        <p>
          <span className="font-medium text-foreground">Repeat</span>
          {" — "}
          After {sessionsLabel}, take a longer {longBreakMinutes}-minute break.
        </p>
        <p>
          Durations can be customized in{" "}
          <Link
            href={POMODORO_SETTINGS_PATH}
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Settings
          </Link>
          .
        </p>
      </div>
    </details>
  );
}

export function PomodoroPage({ data }: PomodoroPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [run, setRun] = useState(data.activeRun);
  const [preferences] = useState(data.preferences);
  const [compactMode, setCompactMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [customRemainingMinutes, setCustomRemainingMinutes] = useState("");
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [taskId, setTaskId] = useState(data.activeRun?.taskId ?? "");
  const [customTitle, setCustomTitle] = useState(
    data.activeRun?.customTitle ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [todaySummary, setTodaySummary] = useState(data.todaySummary);
  const [recentLogs, setRecentLogs] = useState(data.recentLogs);
  const completingRef = useRef(false);
  const defaultTitleRef = useRef<string | null>(null);

  useEffect(() => {
    setRun(data.activeRun);
    setTodaySummary(data.todaySummary);
    setRecentLogs(data.recentLogs);
  }, [data.activeRun, data.todaySummary, data.recentLogs]);

  useEffect(() => {
    try {
      setCompactMode(
        window.localStorage.getItem(POMODORO_COMPACT_STORAGE_KEY) === "1",
      );
    } catch {
      setCompactMode(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.pomodoroCompact = compactMode
      ? "true"
      : "false";
    try {
      if (compactMode) {
        window.localStorage.setItem(POMODORO_COMPACT_STORAGE_KEY, "1");
      } else {
        window.localStorage.removeItem(POMODORO_COMPACT_STORAGE_KEY);
      }
    } catch {
      // Ignore quota / private-mode failures.
    }

    return () => {
      delete document.documentElement.dataset.pomodoroCompact;
    };
  }, [compactMode]);

  useEffect(() => {
    if (!run) {
      return;
    }

    const nextTaskId = taskId || null;
    const nextTitle = customTitle.trim() || null;
    if (
      nextTaskId === (run.taskId ?? null) &&
      nextTitle === (run.customTitle ?? null)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void updatePomodoroAssociationAction({
        taskId: nextTaskId,
        customTitle: nextTitle,
      }).then((result) => {
        if (result.success && result.activeRun) {
          setRun(result.activeRun);
        }
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [customTitle, taskId, run]);

  const isTiming =
    Boolean(run?.startedAt) &&
    (run?.status === "running" || run?.status === "paused");

  const clock = useActivityTimerClock(
    isTiming && run?.startedAt
      ? {
          startedAt: run.startedAt,
          pausedAt: run.pausedAt,
          accumulatedPausedSeconds: run.accumulatedPausedSeconds,
          timerMode: "countDown",
          targetDurationSeconds: run.targetDurationSeconds,
        }
      : null,
    isTiming,
  );

  const phase = run?.phase ?? "focus";
  const awaiting = run?.status === "awaiting_next";
  const dots = cycleDotsState({
    sessionsBeforeLongBreak: preferences.sessionsBeforeLongBreak,
    completedFocusCount: run?.completedFocusCount ?? 0,
    phase,
    status: run?.status ?? "awaiting_next",
  });

  const previewSeconds =
    !isTiming && run
      ? run.targetDurationSeconds
      : !run
        ? preferences.focusDurationSeconds
        : null;

  const displayWorkingOn = resolveWorkingOnLabel({
    run,
    customDraft: customTitle,
    taskId,
    taskOptions: data.taskOptions,
  });

  const focusSessionNumber = Math.max(1, run?.focusIndex ?? 1);
  const sessionLabel =
    phase === "focus"
      ? `Session ${focusSessionNumber} of ${preferences.sessionsBeforeLongBreak}`
      : phaseLabel(phase);
  const targetSeconds =
    run?.targetDurationSeconds ?? preferences.focusDurationSeconds;
  const displaySeconds =
    isTiming && run
      ? clock.displaySeconds
      : previewSeconds ?? targetSeconds;
  const progressRatio =
    targetSeconds > 0
      ? Math.min(1, Math.max(0, 1 - displaySeconds / targetSeconds))
      : 0;
  const clockLabel = formatActivityClock(displaySeconds);
  const phaseHeading = awaiting ? `Next: ${phaseLabel(phase)}` : phaseLabel(phase);
  const remainingSeconds =
    isTiming && run
      ? (clock.remainingSeconds ?? displaySeconds)
      : displaySeconds;
  const needsExplicitFinish =
    isTiming && Boolean(run) && remainingSeconds <= 0;

  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!isTiming || !clock.isComplete || completingRef.current) {
      return;
    }

    const current = runRef.current;
    // Paused / awaiting sessions must not auto-complete or notify.
    // Zero remaining after an adjustment stays paused until Finish.
    if (!current || current.status !== "running") {
      return;
    }

    completingRef.current = true;
    void (async () => {
      const result = await completePomodoroPhaseAction({
        transitionToken: current.transitionToken,
      });
      completingRef.current = false;

      if (!result.success) {
        setError(result.error);
        return;
      }

      setRun(result.activeRun);
      if (result.didComplete) {
        playPomodoroCompletionFeedback(preferences.completionSound);
        void showPomodoroPhaseNotification({
          kind:
            result.completedPhase === "focus"
              ? "focus-complete"
              : "break-complete",
          enabled: preferences.notificationsEnabled,
          transitionToken: result.completedTransitionToken,
        });
      }
      router.refresh();
    })();
  }, [
    clock.isComplete,
    isTiming,
    preferences.completionSound,
    preferences.notificationsEnabled,
    router,
  ]);

  useEffect(() => {
    const reconcile = () => {
      startTransition(async () => {
        const result = await reconcilePomodoroAction();
        if (result.success && result.result?.didComplete) {
          setRun(result.result.activeRun);
          playPomodoroCompletionFeedback(preferences.completionSound);
          void showPomodoroPhaseNotification({
            kind:
              result.result.completedPhase === "focus"
                ? "focus-complete"
                : "break-complete",
            enabled: preferences.notificationsEnabled,
            transitionToken: result.result.completedTransitionToken,
          });
          router.refresh();
        } else if (result.success && result.result?.activeRun) {
          setRun(result.result.activeRun);
        }
      });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reconcile();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    reconcile();

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        reconcile();
      }
    }, 15_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(poll);
    };
  }, [preferences.completionSound, preferences.notificationsEnabled, router]);

  // Document title while timing.
  useEffect(() => {
    if (defaultTitleRef.current === null) {
      defaultTitleRef.current = document.title;
    }

    const restore = () => {
      if (defaultTitleRef.current != null) {
        document.title = defaultTitleRef.current;
      }
    };

    if (!isTiming || !run) {
      restore();
      return restore;
    }

    const update = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      if (run.status === "paused") {
        document.title = "Paused · Pomodoro · Planlet";
        return;
      }

      const label = phaseLabel(run.phase);
      const clockLabel = formatActivityClock(clock.displaySeconds);
      document.title = `${clockLabel} · ${label} · Planlet`;
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(interval);
      restore();
    };
  }, [clock.displaySeconds, isTiming, run]);

  useEffect(() => {
    if (!compactMode) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCompactMode(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compactMode]);

  const runAction = useCallback(
    (action: () => Promise<void>) => {
      setError(null);
      startTransition(async () => {
        try {
          await action();
        } catch (caught) {
          setError(
            caught instanceof Error ? caught.message : "Something went wrong.",
          );
        }
      });
    },
    [],
  );

  function handleStartFocus() {
    warmPomodoroCompletionAudio();
    runAction(async () => {
      const result = await startPomodoroFocusAction({
        taskId: taskId || null,
        customTitle: customTitle.trim() || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(result.activeRun);
      router.refresh();
    });
  }

  function handleStartBreak() {
    warmPomodoroCompletionAudio();
    runAction(async () => {
      const result = await startPomodoroBreakAction();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(result.activeRun);
      router.refresh();
    });
  }

  function handlePause() {
    runAction(async () => {
      const result = await pausePomodoroAction();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(result.activeRun);
    });
  }

  function handleResume() {
    warmPomodoroCompletionAudio();
    runAction(async () => {
      const result = await resumePomodoroAction();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(result.activeRun);
    });
  }

  function handleStop() {
    runAction(async () => {
      const result = await stopPomodoroAction();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(null);
      router.refresh();
    });
  }

  function handleSkipBreak() {
    if (!run || !isBreakPhase(phase)) {
      return;
    }
    const token = run.transitionToken;
    runAction(async () => {
      const result = await skipPomodoroBreakAction({
        transitionToken: token,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(result.activeRun);
      router.refresh();
    });
  }

  function handleAdjustRemaining(input: {
    remainingSeconds?: number | null;
    deltaSeconds?: number | null;
  }) {
    runAction(async () => {
      const result = await adjustPomodoroRemainingAction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(result.activeRun);
      setTimeEditorOpen(false);
      setCustomRemainingMinutes("");
      router.refresh();
    });
  }

  function handleApplyCustomRemaining() {
    const minutes = Number(customRemainingMinutes.trim());
    if (!Number.isFinite(minutes) || minutes < 0) {
      setError("Enter a valid remaining duration.");
      return;
    }
    handleAdjustRemaining({
      remainingSeconds: Math.round(minutes * 60),
    });
  }

  function handleFinishPhase() {
    if (!run) {
      return;
    }
    runAction(async () => {
      const result = await completePomodoroPhaseAction({
        transitionToken: run.transitionToken,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRun(result.activeRun);
      if (result.didComplete) {
        playPomodoroCompletionFeedback(preferences.completionSound);
        // Explicit Finish after adjust-to-zero — notify like a normal completion.
        void showPomodoroPhaseNotification({
          kind:
            result.completedPhase === "focus"
              ? "focus-complete"
              : "break-complete",
          enabled: preferences.notificationsEnabled,
          transitionToken: result.completedTransitionToken,
        });
      }
      setTimeEditorOpen(false);
      router.refresh();
    });
  }

  function persistAssociation(nextTaskId = taskId, nextTitle = customTitle) {
    if (!run) {
      return;
    }
    runAction(async () => {
      const result = await updatePomodoroAssociationAction({
        taskId: nextTaskId || null,
        customTitle: nextTitle.trim() || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.activeRun) {
        setRun(result.activeRun);
      }
    });
  }

  function clearTaskAssociation() {
    setTaskId("");
    setCustomTitle("");
    setTaskEditorOpen(false);
    persistAssociation("", "");
  }

  const hasTodaySessions = todaySummary.sessionCount > 0;

  const primaryBtn = "ui-btn-primary";
  const secondaryBtn = "ui-btn-secondary";
  /** Active or pending break (running, paused, or waiting to start). */
  const showSkipBreak = Boolean(
    run && isBreakPhase(phase) && !needsExplicitFinish,
  );
  const onActiveBreak = Boolean(
    run && isBreakPhase(phase) && !awaiting && !needsExplicitFinish,
  );

  const skipBreakButton = showSkipBreak ? (
    <button
      type="button"
      className={`${secondaryBtn} inline-flex items-center justify-center gap-1.5`}
      disabled={pending}
      onClick={handleSkipBreak}
      aria-label="Skip break"
    >
      <SkipForward className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
      Skip
    </button>
  ) : null;

  const timerControls = (
    <>
      {!run || awaiting ? (
        awaiting && isBreakPhase(phase) ? (
          <>
            <button
              type="button"
              className={primaryBtn}
              disabled={pending}
              onClick={handleStartBreak}
            >
              Start break
            </button>
            {skipBreakButton}
          </>
        ) : (
          <button
            type="button"
            className={primaryBtn}
            disabled={pending}
            onClick={handleStartFocus}
          >
            {awaiting ? "Start focus" : "Start"}
          </button>
        )
      ) : needsExplicitFinish ? (
        <>
          <button
            type="button"
            className={primaryBtn}
            disabled={pending}
            onClick={handleFinishPhase}
          >
            Finish
          </button>
          <button
            type="button"
            className={secondaryBtn}
            disabled={pending}
            onClick={handleStop}
          >
            Stop
          </button>
        </>
      ) : run.status === "paused" ? (
        <>
          <button
            type="button"
            className={primaryBtn}
            disabled={pending}
            onClick={handleResume}
          >
            Resume
          </button>
          {skipBreakButton}
          {!onActiveBreak ? (
            <button
              type="button"
              className={secondaryBtn}
              disabled={pending}
              onClick={handleStop}
            >
              Stop
            </button>
          ) : null}
        </>
      ) : (
        <>
          <button
            type="button"
            className={secondaryBtn}
            disabled={pending}
            onClick={handlePause}
          >
            Pause
          </button>
          {skipBreakButton}
          {!onActiveBreak ? (
            <button
              type="button"
              className={secondaryBtn}
              disabled={pending}
              onClick={handleStop}
            >
              Stop
            </button>
          ) : null}
        </>
      )}
    </>
  );

  // Visible for Focus/Break while running, paused, or awaiting start — not after
  // zero-remaining Finish prompt, and not before a session row exists.
  const canAdjustRemaining = Boolean(run && !needsExplicitFinish);

  const adjustTimeToggle = useCallback(() => {
    setTimeEditorOpen((open) => !open);
    setCustomRemainingMinutes(
      String(Math.max(0, Math.round(remainingSeconds / 60))),
    );
  }, [remainingSeconds]);

  const closeTimeEditor = useCallback(() => {
    setTimeEditorOpen(false);
  }, []);

  const clockAction = canAdjustRemaining
    ? {
        onClick: adjustTimeToggle,
        open: timeEditorOpen,
        disabled: pending,
        label: "Adjust remaining time",
      }
    : null;

  const adjustTimePopover = canAdjustRemaining ? (
    <AdjustTimePopover
      open={timeEditorOpen}
      customMinutes={customRemainingMinutes}
      pending={pending}
      onClose={closeTimeEditor}
      onCustomMinutesChange={setCustomRemainingMinutes}
      onAdjustDelta={(deltaSeconds) =>
        handleAdjustRemaining({ deltaSeconds })
      }
      onApplyCustom={handleApplyCustomRemaining}
    />
  ) : null;

  const compactClock = canAdjustRemaining ? (
    <button
      type="button"
      className="ui-pomodoro-compact-clock ui-pomodoro-clock-action"
      aria-live="polite"
      aria-atomic="true"
      aria-expanded={timeEditorOpen}
      aria-label="Adjust remaining time"
      disabled={pending}
      onClick={adjustTimeToggle}
    >
      {clockLabel}
    </button>
  ) : (
    <p className="ui-pomodoro-compact-clock" aria-live="polite">
      {clockLabel}
    </p>
  );

  if (compactMode) {
    return (
      <section
        className="ui-pomodoro-compact"
        data-pomodoro-compact="true"
        aria-label="Pomodoro compact timer"
      >
        <header className="flex w-full min-w-0 items-center justify-between gap-2">
          <HeaderIconButton
            label="Standard view"
            onClick={() => setCompactMode(false)}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          </HeaderIconButton>
          <HeaderIconButton label="Settings" href={POMODORO_SETTINGS_PATH}>
            <Settings2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          </HeaderIconButton>
        </header>

        <div className="ui-pomodoro-compact-stage">
          <p className="ui-pomodoro-compact-phase">{phaseHeading}</p>
          {compactClock}
          {adjustTimePopover}
          <div
            className="ui-pomodoro-compact-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressRatio * 100)}
            aria-label="Session progress"
          >
            <div
              className="ui-pomodoro-compact-progress-fill"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
          <div className="ui-pomodoro-compact-controls">{timerControls}</div>
          <p className="ui-pomodoro-compact-meta">{sessionLabel}</p>
          {displayWorkingOn ? (
            <p className="ui-pomodoro-compact-task" dir="auto" title={displayWorkingOn}>
              {displayWorkingOn}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-accent-red" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="ui-pomodoro-page mx-auto w-full max-w-lg space-y-5 px-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:px-0 sm:pb-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Pomodoro
        </h1>
        <div className="flex items-center gap-0.5">
          <HeaderIconButton
            label="Compact mode"
            onClick={() => setCompactMode(true)}
          >
            <Minimize2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          </HeaderIconButton>
          <HeaderIconButton label="Settings" href={POMODORO_SETTINGS_PATH}>
            <Settings2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          </HeaderIconButton>
        </div>
      </header>

      <div className="ui-pomodoro-stage">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
          {phaseHeading}
        </p>

        <div className="ui-pomodoro-ring mt-4">
          <ActivityTimerRing
            startedAt={isTiming ? run?.startedAt : null}
            running={isTiming && run?.status === "running"}
            timerMode="countDown"
            targetDurationSeconds={targetSeconds}
            pausedAt={run?.pausedAt}
            accumulatedPausedSeconds={run?.accumulatedPausedSeconds ?? 0}
            previewSeconds={previewSeconds}
            className={phase === "focus" ? "" : "opacity-90"}
            clockAction={clockAction}
          />
        </div>

        {adjustTimePopover ? (
          <div className="mt-3 w-full max-w-sm">{adjustTimePopover}</div>
        ) : null}

        <div className="ui-pomodoro-controls mt-5">{timerControls}</div>

        <div
          className="ui-pomodoro-dots mt-4"
          role="img"
          aria-label={sessionLabel}
        >
          {Array.from({ length: dots.total }, (_, index) => {
            const n = index + 1;
            const filled = n <= dots.filled;
            const active = dots.activeIndex === n;
            return (
              <span
                key={n}
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  filled || active ? "bg-foreground" : "bg-border"
                }`}
                aria-hidden="true"
              />
            );
          })}
        </div>

        <div className="mt-5 w-full max-w-sm">
          {!taskEditorOpen && displayWorkingOn ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <button
                type="button"
                className="min-w-0 truncate font-medium text-foreground transition-colors hover:text-muted"
                dir="auto"
                onClick={() => setTaskEditorOpen(true)}
                title="Change task"
              >
                {displayWorkingOn}
              </button>
              <button
                type="button"
                className="shrink-0 text-muted transition-colors hover:text-foreground"
                onClick={clearTaskAssociation}
                aria-label="Remove task"
                title="Remove task"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
              </button>
            </div>
          ) : null}

          {!taskEditorOpen && !displayWorkingOn ? (
            <button
              type="button"
              className="text-sm text-muted transition-colors hover:text-foreground"
              onClick={() => setTaskEditorOpen(true)}
            >
              + Choose today&apos;s task
            </button>
          ) : null}

          {taskEditorOpen ? (
            <TodayTaskPicker
              taskId={taskId}
              customTitle={customTitle}
              taskOptions={data.taskOptions}
              activities={data.activities}
              showCompleted={showCompletedTasks}
              onShowCompletedChange={setShowCompletedTasks}
              onSelectNone={() => {
                setTaskId("");
                setCustomTitle("");
                persistAssociation("", "");
              }}
              onSelectTask={(id) => {
                setTaskId(id);
                setCustomTitle("");
                persistAssociation(id, "");
              }}
              onSelectActivity={(title) => {
                setTaskId("");
                setCustomTitle(title);
                persistAssociation("", title);
              }}
              onCustomTitleChange={(value) => {
                setCustomTitle(value);
                if (value.trim()) {
                  setTaskId("");
                }
              }}
              onCustomTitleApplied={() => persistAssociation()}
              onClear={clearTaskAssociation}
              onDone={() => setTaskEditorOpen(false)}
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-center text-sm text-accent-red">{error}</p>
      ) : null}

      {hasTodaySessions || recentLogs.length > 0 ? (
        <div className="space-y-3 border-t border-border-soft pt-4">
          {hasTodaySessions ? (
            <div>
              <p className="text-sm font-medium text-foreground">Today</p>
              <p className="mt-1 text-sm text-muted">
                {formatPomodoroFocusedSummary(todaySummary)}
              </p>
            </div>
          ) : null}

          {recentLogs.length > 0 ? (
            <div>
              <button
                type="button"
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
                onClick={() => setHistoryOpen((open) => !open)}
                aria-expanded={historyOpen}
              >
                History
              </button>
              {historyOpen ? (
                <ul className="mt-2 space-y-2">
                  {recentLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span
                        className="min-w-0 truncate text-foreground"
                        dir="auto"
                      >
                        {log.displayTitle}
                      </span>
                      <span className="shrink-0 text-muted">
                        {formatActivityDuration(log.actualFocusedSeconds)}
                        {log.completed ? "" : " · stopped"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <HowPomodoroWorks preferences={preferences} />
    </section>
  );
}
