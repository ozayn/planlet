"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createPomodoroActivityAction,
  deletePomodoroActivityAction,
  renamePomodoroActivityAction,
  reorderPomodoroActivitiesAction,
} from "@/app/(app)/pomodoro/actions";
import { GripVerticalIcon } from "@/components/ui/action-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  MAX_POMODORO_ACTIVITIES,
  MAX_POMODORO_TITLE_LENGTH,
  type PomodoroActivityOption,
} from "@/lib/pomodoro/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type PomodoroActivitySettingsProps = {
  activities: PomodoroActivityOption[];
};

export function PomodoroActivitySettings({
  activities: initial,
}: PomodoroActivitySettingsProps) {
  const router = useRouter();
  const [activities, setActivities] = useState(initial);
  const [draftTitle, setDraftTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setActivities(initial);
  }, [initial]);

  function refresh() {
    router.refresh();
  }

  function persistOrder(next: PomodoroActivityOption[]) {
    const rollback = activities;
    setActivities(next);
    setError(null);

    startTransition(async () => {
      const result = await reorderPomodoroActivitiesAction(
        next.map((activity) => activity.id),
      );
      if (!result.success) {
        setActivities(rollback);
        setError(result.error);
        return;
      }
      setActivities(result.activities);
      refresh();
    });
  }

  function moveActivity(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= activities.length) {
      return;
    }
    const next = [...activities];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    persistOrder(next);
  }

  function handleAdd() {
    const title = draftTitle.trim();
    if (!title) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createPomodoroActivityAction(title);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDraftTitle("");
      refresh();
    });
  }

  function startRename(activity: PomodoroActivityOption) {
    setEditingId(activity.id);
    setEditingTitle(activity.title);
    setError(null);
  }

  function saveRename() {
    if (!editingId) {
      return;
    }
    const title = editingTitle.trim();
    if (!title) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await renamePomodoroActivityAction(editingId, title);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      setEditingTitle("");
      refresh();
    });
  }

  function handleDelete(activityId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deletePomodoroActivityAction(activityId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setConfirmDeleteId(null);
      refresh();
    });
  }

  const atLimit = activities.length >= MAX_POMODORO_ACTIVITIES;
  const confirmTarget = activities.find(
    (activity) => activity.id === confirmDeleteId,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Optional favorites for quick selection on the Pomodoro page. Separate
        from Planner tasks.
      </p>

      {activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-soft px-3 py-3 text-sm text-muted">
          No activities yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {activities.map((activity, index) => (
            <li
              key={activity.id}
              className="flex items-start gap-2 rounded-xl border border-border-soft bg-background px-2 py-2"
            >
              <span
                className="mt-1 hidden shrink-0 text-muted-light sm:inline-flex"
                aria-hidden="true"
              >
                <GripVerticalIcon className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                {editingId === activity.id ? (
                  <input
                    className="ui-input w-full"
                    value={editingTitle}
                    maxLength={MAX_POMODORO_TITLE_LENGTH}
                    disabled={pending}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveRename();
                      }
                      if (event.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    aria-label={`Rename ${activity.title}`}
                    autoFocus
                    {...passwordManagerSafeControlProps}
                  />
                ) : (
                  <p
                    className="truncate text-sm font-medium text-foreground"
                    dir="auto"
                  >
                    {activity.title}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
                <button
                  type="button"
                  onClick={() => moveActivity(index, -1)}
                  disabled={pending || index === 0}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                  aria-label={`Move ${activity.title} up`}
                  {...passwordManagerSafeControlProps}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveActivity(index, 1)}
                  disabled={pending || index === activities.length - 1}
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                  aria-label={`Move ${activity.title} down`}
                  {...passwordManagerSafeControlProps}
                >
                  ↓
                </button>
                {editingId === activity.id ? (
                  <button
                    type="button"
                    onClick={saveRename}
                    disabled={pending || !editingTitle.trim()}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-50"
                    {...passwordManagerSafeControlProps}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startRename(activity)}
                    disabled={pending}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-50"
                    {...passwordManagerSafeControlProps}
                  >
                    Rename
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(activity.id)}
                  disabled={pending}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-50"
                  {...passwordManagerSafeControlProps}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="ui-input min-w-0 flex-1"
          value={draftTitle}
          maxLength={MAX_POMODORO_TITLE_LENGTH}
          disabled={pending || atLimit}
          placeholder="New activity"
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
          aria-label="New activity title"
          {...passwordManagerSafeControlProps}
        />
        <button
          type="button"
          className="ui-btn-secondary min-h-10 shrink-0"
          disabled={pending || atLimit || !draftTitle.trim()}
          onClick={handleAdd}
          {...passwordManagerSafeControlProps}
        >
          Add
        </button>
      </div>

      {atLimit ? (
        <p className="text-xs text-muted">
          Limit of {MAX_POMODORO_ACTIVITIES} activities reached.
        </p>
      ) : null}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete activity?"
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteId) {
            handleDelete(confirmDeleteId);
          }
        }}
        onCancel={() => {
          if (!pending) {
            setConfirmDeleteId(null);
          }
        }}
        isConfirming={pending && Boolean(confirmDeleteId)}
        confirmDanger
      >
        <p className="text-sm text-muted">
          {confirmTarget
            ? `Remove “${confirmTarget.title}” from your Pomodoro favorites. Past sessions stay in history.`
            : "Remove this activity from your Pomodoro favorites."}
        </p>
      </ConfirmDialog>
    </div>
  );
}
