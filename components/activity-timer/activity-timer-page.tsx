"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  startActivityTimerAction,
  stopActivityTimerAction,
} from "@/app/(app)/timer/actions";
import { useActivityTimer } from "@/components/activity-timer/activity-timer-context";
import { ActivityTimerCustomSheet } from "@/components/activity-timer/activity-timer-custom-sheet";
import { ActivityTimerPresetGrid } from "@/components/activity-timer/activity-timer-preset-grid";
import { ActivityTimerRecentSessions } from "@/components/activity-timer/activity-timer-recent-sessions";
import { ActivityTimerRing } from "@/components/activity-timer/activity-timer-ring";
import { ActivityTimerSessionEditSheet } from "@/components/activity-timer/activity-timer-session-edit-sheet";
import { ActivityTimerTimeline } from "@/components/activity-timer/activity-timer-timeline";
import type {
  ActivityTimerPageData,
  SerializedActivityTimerPreset,
  SerializedActivityTimerSession,
} from "@/lib/activity-timer/constants";

type ActivityTimerPageProps = {
  data: ActivityTimerPageData;
};

export function ActivityTimerPage({ data }: ActivityTimerPageProps) {
  const router = useRouter();
  const { activeSession, setActiveSession } = useActivityTimer();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customSheetOpen, setCustomSheetOpen] = useState(false);
  const [editingSession, setEditingSession] =
    useState<SerializedActivityTimerSession | null>(null);

  const isRunning = Boolean(activeSession);
  const displayTitle = activeSession?.title ?? "";

  function refresh() {
    router.refresh();
  }

  function handleSelectPreset(preset: SerializedActivityTimerPreset) {
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
        notes: activeSession.notes,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setActiveSession(null);
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
        />

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
