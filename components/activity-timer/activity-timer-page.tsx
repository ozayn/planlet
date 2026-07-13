"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  deleteActivityTimerSessionAction,
  pauseActivityTimerAction,
  resumeActivityTimerAction,
  startActivityTimerAction,
  stopActivityTimerAction,
} from "@/app/(app)/timer/actions";
import { useActivityTimer } from "@/components/activity-timer/activity-timer-context";
import { ActivityTimerAddNote } from "@/components/activity-timer/activity-timer-add-note";
import { ActivityTimerCustomSheet } from "@/components/activity-timer/activity-timer-custom-sheet";
import { ActivityTimerPresetGrid } from "@/components/activity-timer/activity-timer-preset-grid";
import { ActivityTimerRecentSessions } from "@/components/activity-timer/activity-timer-recent-sessions";
import { ActivityTimerRing } from "@/components/activity-timer/activity-timer-ring";
import { ActivityTimerSessionEditSheet } from "@/components/activity-timer/activity-timer-session-edit-sheet";
import { ActivityTimerSessionNotesList } from "@/components/activity-timer/activity-timer-session-notes-list";
import { ActivityTimerTargetStatus } from "@/components/activity-timer/activity-timer-target-status";
import { ActivityTimerTimeline } from "@/components/activity-timer/activity-timer-timeline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useActivityTimerClock } from "@/components/activity-timer/use-activity-timer-clock";
import { playActivityTimerCompletionFeedback } from "@/lib/activity-timer/completion-feedback";
import { ACTION_LABELS } from "@/lib/action-labels";
import type {
  ActivityTimerPageData,
  SerializedActivityTimerPreset,
  SerializedActivityTimerSession,
  SerializedActivityTimerSessionNote,
} from "@/lib/activity-timer/constants";

type ActivityTimerPageProps = {
  data: ActivityTimerPageData;
};

export function ActivityTimerPage({ data }: ActivityTimerPageProps) {
  const router = useRouter();
  const { activeSession: contextSession, setActiveSession } = useActivityTimer();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customSheetOpen, setCustomSheetOpen] = useState(false);
  const [armedCountdownPreset, setArmedCountdownPreset] =
    useState<SerializedActivityTimerPreset | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [confirmPartialStop, setConfirmPartialStop] = useState(false);
  const completingRef = useRef(false);
  const [editingSession, setEditingSession] =
    useState<SerializedActivityTimerSession | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState<
    SerializedActivityTimerSessionNote[]
  >(data.activeSession?.sessionNotes ?? []);

  useEffect(() => {
    setActiveSession(data.activeSession);
  }, [data.activeSession, setActiveSession]);

  useEffect(() => {
    setSessionNotes(
      data.activeSession?.sessionNotes ?? contextSession?.sessionNotes ?? [],
    );
  }, [
    contextSession?.sessionNotes,
    data.activeSession?.id,
    data.activeSession?.sessionNotes,
  ]);

  const activeSession = data.activeSession ?? contextSession;
  const isRunning = Boolean(activeSession);
  const isArmed = Boolean(armedCountdownPreset) && !isRunning;
  const displayTitle =
    activeSession?.title ?? armedCountdownPreset?.title ?? "";
  const clock = useActivityTimerClock(activeSession, isRunning);
  const timerMode =
    activeSession?.timerMode ??
    armedCountdownPreset?.timerMode ??
    "countUp";
  const targetDurationSeconds =
    activeSession?.targetDurationSeconds ??
    armedCountdownPreset?.targetDurationSeconds ??
    null;

  function refresh() {
    router.refresh();
  }

  function restoreActiveSession(
    session: NonNullable<ActivityTimerPageData["activeSession"]>,
  ) {
    setActiveSession(session);
    setSessionNotes(session.sessionNotes);
    refresh();
  }

  function clearArmedCountdown() {
    setArmedCountdownPreset(null);
  }

  function handleSelectPreset(preset: SerializedActivityTimerPreset) {
    if (activeSession) {
      restoreActiveSession(activeSession);
      return;
    }

    setError(null);

    if (preset.timerMode === "countDown") {
      setArmedCountdownPreset(preset);
      return;
    }

    startTransition(async () => {
      const result = await startActivityTimerAction({
        title: preset.title,
        presetId: preset.id,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      clearArmedCountdown();
      setActiveSession(result.activeSession);
      setSessionNotes(result.activeSession.sessionNotes);
      refresh();
    });
  }

  function handleStartArmedCountdown() {
    if (!armedCountdownPreset) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await startActivityTimerAction({
        title: armedCountdownPreset.title,
        presetId: armedCountdownPreset.id,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      clearArmedCountdown();
      setActiveSession(result.activeSession);
      setSessionNotes(result.activeSession.sessionNotes);
      refresh();
    });
  }

  function finishSession(options: {
    completed?: boolean;
    discard?: boolean;
  }) {
    if (!activeSession) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await stopActivityTimerAction({
        sessionId: activeSession.id,
        completed: options.completed,
        discard: options.discard,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      completingRef.current = false;
      setShowComplete(false);
      setConfirmPartialStop(false);
      setActiveSession(null);
      setSessionNotes([]);
      refresh();
    });
  }

  function handleStopRequest() {
    if (!activeSession) {
      return;
    }

    if (
      activeSession.timerMode === "countDown" &&
      !clock.isComplete &&
      clock.activeElapsedSeconds > 0
    ) {
      setConfirmPartialStop(true);
      return;
    }

    finishSession({ completed: clock.isComplete });
  }

  function handlePauseToggle() {
    if (!activeSession) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = clock.isPaused
        ? await resumeActivityTimerAction(activeSession.id)
        : await pauseActivityTimerAction(activeSession.id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setActiveSession(result.activeSession);
      setSessionNotes(result.activeSession.sessionNotes);
      refresh();
    });
  }

  useEffect(() => {
    if (
      !isRunning ||
      !activeSession ||
      activeSession.timerMode !== "countDown" ||
      clock.isPaused ||
      !clock.isComplete ||
      completingRef.current
    ) {
      return;
    }

    completingRef.current = true;
    setShowComplete(true);
    playActivityTimerCompletionFeedback();
    finishSession({ completed: true });
  }, [
    activeSession,
    clock.isComplete,
    clock.isPaused,
    isRunning,
  ]);

  function handleRequestDelete(sessionId: string) {
    if (activeSession?.id === sessionId) {
      setError("Stop the timer before deleting this entry.");
      return;
    }

    setError(null);
    setConfirmDeleteId(sessionId);
  }

  function handleDelete(sessionId: string) {
    setError(null);

    startTransition(async () => {
      const result = await deleteActivityTimerSessionAction(sessionId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setConfirmDeleteId(null);

      if (editingSession?.id === sessionId) {
        setEditingSession(null);
      }

      refresh();
    });
  }

  const showTimerSection = isRunning || isArmed;

  return (
    <div className="ui-activity-timer-page space-y-5 sm:space-y-8">
      <section className="flex flex-col items-center space-y-3 py-0 text-center sm:space-y-4">
        {showTimerSection ? (
          <h2 className="max-w-md px-2 text-base font-medium text-foreground sm:text-lg">
            {displayTitle}
          </h2>
        ) : null}

        <ActivityTimerRing
          startedAt={activeSession?.startedAt ?? null}
          running={isRunning}
          timerMode={timerMode}
          targetDurationSeconds={targetDurationSeconds}
          pausedAt={activeSession?.pausedAt ?? null}
          accumulatedPausedSeconds={activeSession?.accumulatedPausedSeconds ?? 0}
          previewSeconds={
            isArmed && targetDurationSeconds != null
              ? targetDurationSeconds
              : null
          }
        />

        {isRunning ? (
          <ActivityTimerTargetStatus
            timerMode={activeSession!.timerMode}
            elapsedSeconds={clock.activeElapsedSeconds}
            targetDurationSeconds={activeSession?.targetDurationSeconds}
            isComplete={showComplete || clock.isComplete}
            isPaused={clock.isPaused}
          />
        ) : null}

        {isArmed ? (
          <div className="flex w-full max-w-sm flex-col items-stretch gap-3 px-2 sm:max-w-none sm:items-center">
            <button
              type="button"
              onClick={handleStartArmedCountdown}
              disabled={isPending}
              className="ui-btn-primary w-full rounded-2xl px-8 sm:min-w-40 sm:w-auto"
            >
              Start
            </button>
            <button
              type="button"
              onClick={clearArmedCountdown}
              disabled={isPending}
              className="ui-btn-secondary min-h-10 w-full sm:w-auto"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {isRunning ? (
          <div className="flex w-full max-w-sm flex-col items-stretch gap-3 px-2 sm:max-w-none sm:items-center">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handlePauseToggle}
                disabled={isPending || showComplete}
                className="ui-btn-secondary w-full rounded-2xl px-8 sm:min-w-32 sm:w-auto"
              >
                {clock.isPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={handleStopRequest}
                disabled={isPending || showComplete}
                className="ui-btn-primary w-full rounded-2xl px-8 sm:min-w-32 sm:w-auto"
              >
                Stop
              </button>
            </div>

            <ActivityTimerAddNote
              sessionId={activeSession!.id}
              disabled={isPending || clock.isPaused}
              onNoteAdded={refresh}
            />
          </div>
        ) : null}

        {isRunning ? (
          <ActivityTimerSessionNotesList notes={sessionNotes} />
        ) : null}
      </section>

      {!showTimerSection ? (
        <>
          <ActivityTimerPresetGrid
            presets={data.presets}
            disabled={isPending}
            onSelectPreset={handleSelectPreset}
            onNewActivity={() => setCustomSheetOpen(true)}
          />

          <ActivityTimerRecentSessions
            sessions={data.recentSessions}
            disabled={isPending}
            onSelect={setEditingSession}
            onDelete={handleRequestDelete}
          />

          <ActivityTimerTimeline
            insights={data.insights}
            disabled={isPending}
            onDelete={handleRequestDelete}
          />
        </>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}

      <ActivityTimerCustomSheet
        open={customSheetOpen}
        onClose={() => setCustomSheetOpen(false)}
        onStarted={refresh}
      />

      <ActivityTimerSessionEditSheet
        session={editingSession}
        open={Boolean(editingSession)}
        onClose={() => {
          setEditingSession(null);
          refresh();
        }}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this timer entry?"
        confirmLabel={ACTION_LABELS.deleteActivityTimerSession.title}
        onConfirm={() => {
          if (confirmDeleteId) {
            handleDelete(confirmDeleteId);
          }
        }}
        onCancel={() => {
          if (!isPending) {
            setConfirmDeleteId(null);
          }
        }}
        isConfirming={isPending && confirmDeleteId !== null}
        confirmDanger
      >
        <span className="sr-only">Confirm deletion of this timer entry.</span>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmPartialStop}
        title="Save this partial session?"
        confirmLabel="Save"
        cancelLabel="Discard"
        onConfirm={() => finishSession({ completed: false })}
        onCancel={() => finishSession({ discard: true })}
        isConfirming={isPending && confirmPartialStop}
      >
        <span className="sr-only">
          Choose whether to save or discard this partial countdown session.
        </span>
      </ConfirmDialog>
    </div>
  );
}
