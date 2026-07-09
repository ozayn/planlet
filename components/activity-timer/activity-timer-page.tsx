"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  deleteActivityTimerSessionAction,
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
import { useWallClockElapsed } from "@/components/activity-timer/use-wall-clock-elapsed";
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
  const displayTitle = activeSession?.title ?? "";
  const elapsedSeconds = useWallClockElapsed(
    activeSession?.startedAt ?? null,
    isRunning,
  );

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

  function handleSelectPreset(preset: SerializedActivityTimerPreset) {
    if (activeSession) {
      restoreActiveSession(activeSession);
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await startActivityTimerAction({
        title: preset.title,
        presetId: preset.id,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setActiveSession(result.activeSession);
      setSessionNotes(result.activeSession.sessionNotes);
      refresh();
    });
  }

  function handleStop() {
    if (!activeSession) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await stopActivityTimerAction({
        sessionId: activeSession.id,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setActiveSession(null);
      setSessionNotes([]);
      refresh();
    });
  }

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

  return (
    <div className="space-y-5 sm:space-y-8">
      <section className="flex flex-col items-center space-y-3 py-0 text-center sm:space-y-4">
        {isRunning ? (
          <h2 className="max-w-md px-2 text-base font-medium text-foreground sm:text-lg">
            {displayTitle}
          </h2>
        ) : null}

        <ActivityTimerRing
          startedAt={activeSession?.startedAt ?? null}
          running={isRunning}
          targetDurationSeconds={activeSession?.targetDurationSeconds ?? null}
        />

        {isRunning ? (
          <ActivityTimerTargetStatus
            elapsedSeconds={elapsedSeconds}
            targetDurationSeconds={activeSession?.targetDurationSeconds}
          />
        ) : null}

        {isRunning ? (
          <div className="flex w-full max-w-sm flex-col items-stretch gap-3 px-2 sm:max-w-none sm:items-center">
            <button
              type="button"
              onClick={handleStop}
              disabled={isPending}
              className="ui-btn-primary min-h-12 w-full rounded-2xl px-8 text-base sm:min-h-14 sm:min-w-40 sm:w-auto"
            >
              Stop
            </button>

            <ActivityTimerAddNote
              sessionId={activeSession!.id}
              disabled={isPending}
              onNoteAdded={refresh}
            />
          </div>
        ) : null}

        {isRunning ? (
          <ActivityTimerSessionNotesList notes={sessionNotes} />
        ) : null}
      </section>

      {!isRunning ? (
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
    </div>
  );
}
