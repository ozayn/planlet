"use client";

import Link from "next/link";
import { Maximize2, Settings2, X } from "lucide-react";
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
  completePomodoroPhaseAction,
  pausePomodoroAction,
  reconcilePomodoroAction,
  resumePomodoroAction,
  startPomodoroBreakAction,
  startPomodoroFocusAction,
  stopPomodoroAction,
  updatePomodoroAssociationAction,
} from "@/app/(app)/pomodoro/actions";
import { ActivityTimerRing } from "@/components/activity-timer/activity-timer-ring";
import { useActivityTimerClock } from "@/components/activity-timer/use-activity-timer-clock";
import { VoiceTextField } from "@/components/audio/voice-text-field";
import { InfoIcon } from "@/components/ui/action-icons";
import { formatActivityClock, formatActivityDuration } from "@/lib/activity-timer/format";
import {
  POMODORO_SETTINGS_PATH,
  type PomodoroActivityOption,
  type PomodoroPageData,
  type PomodoroPreferences,
  type PomodoroTaskOption,
  type SerializedPomodoroActiveRun,
} from "@/lib/pomodoro/constants";
import { cycleDotsState, phaseLabel } from "@/lib/pomodoro/cycle";
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
  const [focusMode, setFocusMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [taskId, setTaskId] = useState(data.activeRun?.taskId ?? "");
  const [customTitle, setCustomTitle] = useState(
    data.activeRun?.customTitle ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [todaySummary, setTodaySummary] = useState(data.todaySummary);
  const [recentLogs, setRecentLogs] = useState(data.recentLogs);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const completingRef = useRef(false);
  const defaultTitleRef = useRef<string | null>(null);

  useEffect(() => {
    setRun(data.activeRun);
    setTodaySummary(data.todaySummary);
    setRecentLogs(data.recentLogs);
  }, [data.activeRun, data.todaySummary, data.recentLogs]);

  useEffect(() => {
    setFullscreenAvailable(
      typeof document !== "undefined" &&
        typeof document.documentElement.requestFullscreen === "function",
    );
  }, []);

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
  const sessionAccessibleLabel =
    phase === "focus"
      ? `Session ${focusSessionNumber} of ${preferences.sessionsBeforeLongBreak}`
      : phaseLabel(phase);

  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!isTiming || !clock.isComplete || completingRef.current) {
      return;
    }

    const current = runRef.current;
    // Paused / awaiting sessions must not auto-complete or notify.
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
    if (!focusMode) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFocusMode(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

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

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Optional; ignore denials.
    }
  }

  const hasTodaySessions = todaySummary.sessionCount > 0;

  return (
    <section
      className={`ui-pomodoro-page mx-auto w-full max-w-lg space-y-5 px-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:px-0 sm:pb-4 ${
        focusMode ? "ui-pomodoro-focus-mode" : ""
      }`}
      data-pomodoro-focus-mode={focusMode ? "true" : undefined}
    >
      {!focusMode ? (
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Pomodoro
          </h1>
          <div className="flex items-center gap-0.5">
            <HeaderIconButton
              label="Focus mode"
              onClick={() => setFocusMode(true)}
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
            </HeaderIconButton>
            <HeaderIconButton label="Settings" href={POMODORO_SETTINGS_PATH}>
              <Settings2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
            </HeaderIconButton>
          </div>
        </header>
      ) : (
        <header className="flex items-center justify-end gap-0.5">
          {fullscreenAvailable ? (
            <HeaderIconButton
              label="Fullscreen"
              onClick={() => {
                void enterFullscreen();
              }}
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
            </HeaderIconButton>
          ) : null}
          <HeaderIconButton
            label="Exit focus mode"
            onClick={() => setFocusMode(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
          </HeaderIconButton>
        </header>
      )}

      <div className="ui-pomodoro-stage">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
          {awaiting ? `Next: ${phaseLabel(phase)}` : phaseLabel(phase)}
        </p>

        <div className="ui-pomodoro-ring mt-4">
          <ActivityTimerRing
            startedAt={isTiming ? run?.startedAt : null}
            running={isTiming && run?.status === "running"}
            timerMode="countDown"
            targetDurationSeconds={
              run?.targetDurationSeconds ?? preferences.focusDurationSeconds
            }
            pausedAt={run?.pausedAt}
            accumulatedPausedSeconds={run?.accumulatedPausedSeconds ?? 0}
            previewSeconds={previewSeconds}
            className={phase === "focus" ? "" : "opacity-90"}
          />
        </div>

        <div className="ui-pomodoro-controls mt-5">
          {!run || awaiting ? (
            awaiting && phase !== "focus" ? (
              <button
                type="button"
                className="ui-btn-primary min-h-11 min-w-[7.5rem]"
                disabled={pending}
                onClick={handleStartBreak}
              >
                Start break
              </button>
            ) : (
              <button
                type="button"
                className="ui-btn-primary min-h-11 min-w-[7.5rem]"
                disabled={pending}
                onClick={handleStartFocus}
              >
                {awaiting ? "Start focus" : "Start"}
              </button>
            )
          ) : run.status === "paused" ? (
            <>
              <button
                type="button"
                className="ui-btn-primary min-h-11 min-w-[7.5rem]"
                disabled={pending}
                onClick={handleResume}
              >
                Resume
              </button>
              <button
                type="button"
                className="ui-btn-secondary min-h-11 min-w-[7.5rem]"
                disabled={pending}
                onClick={handleStop}
              >
                Stop
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="ui-btn-secondary min-h-11 min-w-[7.5rem]"
                disabled={pending}
                onClick={handlePause}
              >
                Pause
              </button>
              <button
                type="button"
                className="ui-btn-secondary min-h-11 min-w-[7.5rem]"
                disabled={pending}
                onClick={handleStop}
              >
                Stop
              </button>
            </>
          )}
        </div>

        <div
          className="ui-pomodoro-dots mt-4"
          role="img"
          aria-label={sessionAccessibleLabel}
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

        {focusMode && displayWorkingOn ? (
          <p
            className="mt-5 max-w-sm truncate text-sm font-medium text-foreground"
            dir="auto"
          >
            {displayWorkingOn}
          </p>
        ) : null}

        {!focusMode ? (
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
        ) : null}
      </div>

      {error ? (
        <p className="text-center text-sm text-accent-red">{error}</p>
      ) : null}

      {!focusMode ? (
        <>
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
        </>
      ) : null}
    </section>
  );
}
