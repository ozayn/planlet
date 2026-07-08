"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
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
import { useWallClockElapsed } from "@/components/activity-timer/use-wall-clock-elapsed";
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

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-center space-y-6 py-2 text-center">
        {isRunning ? (
          <h2 className="max-w-md text-lg font-medium text-foreground">
            {displayTitle}
          </h2>
        ) : (
          <div className="h-7" aria-hidden="true" />
        )}

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
          <button
            type="button"
            onClick={handleStop}
            disabled={isPending}
            className="ui-btn-primary min-h-14 min-w-40 rounded-2xl px-8 text-base"
          >
            Stop
          </button>
        ) : null}

        {isRunning ? (
          <ActivityTimerAddNote
            sessionId={activeSession!.id}
            disabled={isPending}
            onNoteAdded={refresh}
          />
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
            onSelect={setEditingSession}
          />

          <ActivityTimerTimeline insights={data.insights} />
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
    </div>
  );
}
