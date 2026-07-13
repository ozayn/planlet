"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  archiveActivityTimerPresetAction,
  deleteActivityTimerPresetAction,
  reorderActivityTimerPresetsAction,
  restoreActivityTimerPresetAction,
} from "@/app/(app)/timer/actions";
import { ActivityTimerPresetFormSheet } from "@/components/activity-timer/activity-timer-preset-form-sheet";
import { ActivityPresetIcon } from "@/components/activity-timer/activity-preset-icon";
import { SettingsSection } from "@/components/settings/settings-section";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GripVerticalIcon } from "@/components/ui/action-icons";
import type {
  ActivityTimerPresetSettingsData,
  SerializedActivityTimerPresetManagement,
} from "@/lib/activity-timer/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ActivityTimerPresetSettingsProps = {
  data: ActivityTimerPresetSettingsData;
  embedded?: boolean;
};

function presetDetail(preset: SerializedActivityTimerPresetManagement): string {
  if (preset.timerMode === "countDown") {
    return [preset.targetDurationLabel, preset.category].filter(Boolean).join(" · ");
  }

  return [preset.category, preset.targetDurationLabel].filter(Boolean).join(" · ");
}

export function ActivityTimerPresetSettings({
  data,
  embedded = false,
}: ActivityTimerPresetSettingsProps) {
  const router = useRouter();
  const [activePresets, setActivePresets] = useState(data.activePresets);
  const [archivedPresets, setArchivedPresets] = useState(data.archivedPresets);
  const [editingPreset, setEditingPreset] =
    useState<SerializedActivityTimerPresetManagement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActivePresets(data.activePresets);
    setArchivedPresets(data.archivedPresets);
  }, [data.activePresets, data.archivedPresets]);

  function refresh() {
    router.refresh();
  }

  function persistOrder(next: SerializedActivityTimerPresetManagement[]) {
    const rollback = activePresets;
    setError(null);
    setActivePresets(next);

    startTransition(async () => {
      const result = await reorderActivityTimerPresetsAction(
        next.map((preset) => preset.id),
      );

      if (!result.success) {
        setActivePresets(rollback);
        setError(result.error);
        return;
      }

      refresh();
    });
  }

  function movePreset(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= activePresets.length) {
      return;
    }

    const next = [...activePresets];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    persistOrder(next);
  }

  function handleArchive(presetId: string) {
    setError(null);

    startTransition(async () => {
      const result = await archiveActivityTimerPresetAction(presetId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      refresh();
    });
  }

  function handleRestore(presetId: string) {
    setError(null);

    startTransition(async () => {
      const result = await restoreActivityTimerPresetAction(presetId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      refresh();
    });
  }

  function handleDelete(presetId: string) {
    setError(null);

    startTransition(async () => {
      const result = await deleteActivityTimerPresetAction(presetId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setConfirmDeleteId(null);
      refresh();
    });
  }

  function openCreateForm() {
    setEditingPreset(null);
    setFormOpen(true);
  }

  function openEditForm(preset: SerializedActivityTimerPresetManagement) {
    setEditingPreset(preset);
    setFormOpen(true);
  }

  const content = (
    <>
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted">
            Choose the activities that appear as permanent presets on your Timer
            page.
          </p>
        </div>

        <div className="space-y-2">
          {activePresets.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-soft px-3 py-4 text-sm text-muted">
              No active presets yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {activePresets.map((preset, index) => {
                const detail = presetDetail(preset);

                return (
                  <li
                    key={preset.id}
                    className="flex items-start gap-2 rounded-xl border border-border-soft bg-background px-2 py-2"
                  >
                    <span
                      className="mt-1 hidden shrink-0 text-muted-light sm:inline-flex"
                      aria-hidden="true"
                    >
                      <GripVerticalIcon className="size-4" />
                    </span>

                    <ActivityPresetIcon
                      iconName={preset.iconName}
                      className="mt-0.5 size-4 shrink-0 text-muted sm:size-[18px]"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {preset.title}
                      </p>
                      {detail ? (
                        <p className="truncate text-xs text-muted-light">
                          {detail}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => movePreset(index, -1)}
                        disabled={isPending || index === 0}
                        {...passwordManagerSafeControlProps}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                        aria-label={`Move ${preset.title} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => movePreset(index, 1)}
                        disabled={
                          isPending || index === activePresets.length - 1
                        }
                        {...passwordManagerSafeControlProps}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                        aria-label={`Move ${preset.title} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(preset)}
                        disabled={isPending}
                        {...passwordManagerSafeControlProps}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(preset.id)}
                        disabled={isPending}
                        {...passwordManagerSafeControlProps}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-50"
                      >
                        Archive
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          disabled={isPending}
          {...passwordManagerSafeControlProps}
          className="ui-btn-secondary min-h-10 w-full sm:w-auto"
        >
          Add preset
        </button>

        {archivedPresets.length > 0 ? (
          <div className="space-y-2 border-t border-border-soft pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-light">
              Archived
            </p>
            <ul className="space-y-1.5">
              {archivedPresets.map((preset) => {
                const detail = presetDetail(preset);

                return (
                  <li
                    key={preset.id}
                    className="flex items-start gap-2 rounded-xl border border-border-soft bg-background px-2 py-2"
                  >
                    <ActivityPresetIcon
                      iconName={preset.iconName}
                      className="mt-0.5 size-4 shrink-0 text-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-muted">{preset.title}</p>
                      {detail ? (
                        <p className="truncate text-xs text-muted-light">
                          {detail}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleRestore(preset.id)}
                        disabled={isPending}
                        {...passwordManagerSafeControlProps}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-50"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(preset.id)}
                        disabled={isPending}
                        {...passwordManagerSafeControlProps}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-accent-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <ActivityTimerPresetFormSheet
        preset={editingPreset}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this preset permanently?"
        confirmLabel="Delete"
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
        <span className="sr-only">
          Confirm permanent deletion of this timer preset.
        </span>
      </ConfirmDialog>
    </>
  );

  if (embedded) {
    return content;
  }

  return <SettingsSection title="Timer presets">{content}</SettingsSection>;
}
