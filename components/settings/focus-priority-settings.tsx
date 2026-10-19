"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  archiveFocusPriorityAction,
  createFocusPriorityAction,
  reorderFocusPrioritiesAction,
  restoreFocusPriorityAction,
  updateFocusPriorityAction,
} from "@/app/(app)/focus-priorities/actions";
import { LifeAreaColorDot } from "@/components/plans/life-area-color-dot";
import { GripVerticalIcon } from "@/components/ui/action-icons";
import {
  MAX_FOCUS_PRIORITY_DESCRIPTION_LENGTH,
  MAX_FOCUS_PRIORITY_TASK_TITLE_LENGTH,
  MAX_FOCUS_PRIORITY_TITLE_LENGTH,
  defaultSuggestedTaskTitle,
  formatSubtopicsInput,
  parseSubtopicsInput,
} from "@/lib/focus-priorities/constants";
import type { SerializedFocusPriority } from "@/lib/focus-priorities/types";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type FocusPrioritySettingsProps = {
  priorities: SerializedFocusPriority[];
  lifeAreas: SerializedLifeArea[];
};

type DraftFields = {
  title: string;
  lifeAreaId: string;
  description: string;
  suggestedTaskTitle: string;
  defaultDurationMinutes: string;
  subtopics: string;
};

function emptyDraft(lifeAreaId: string): DraftFields {
  return {
    title: "",
    lifeAreaId,
    description: "",
    suggestedTaskTitle: "",
    defaultDurationMinutes: "",
    subtopics: "",
  };
}

function toDraft(priority: SerializedFocusPriority): DraftFields {
  return {
    title: priority.title,
    lifeAreaId: priority.lifeAreaId,
    description: priority.description ?? "",
    suggestedTaskTitle: priority.suggestedTaskTitle,
    defaultDurationMinutes:
      priority.defaultDurationMinutes == null
        ? ""
        : String(priority.defaultDurationMinutes),
    subtopics: formatSubtopicsInput(priority.subtopics),
  };
}

function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const minutes = Number(trimmed);
  return Number.isFinite(minutes) ? minutes : null;
}

function toWriteInput(draft: DraftFields) {
  const title = draft.title.trim();
  return {
    title,
    lifeAreaId: draft.lifeAreaId,
    description: draft.description.trim() || null,
    suggestedTaskTitle:
      draft.suggestedTaskTitle.trim() || defaultSuggestedTaskTitle(title),
    defaultDurationMinutes: parseDuration(draft.defaultDurationMinutes),
    subtopics: parseSubtopicsInput(draft.subtopics),
  };
}

export function FocusPrioritySettings({
  priorities: initial,
  lifeAreas,
}: FocusPrioritySettingsProps) {
  const router = useRouter();
  const [priorities, setPriorities] = useState(initial);
  const [draft, setDraft] = useState(() =>
    emptyDraft(lifeAreas[0]?.id ?? ""),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPriorities(initial);
  }, [initial]);

  useEffect(() => {
    if (!draft.lifeAreaId && lifeAreas[0]?.id) {
      setDraft((current) => ({ ...current, lifeAreaId: lifeAreas[0].id }));
    }
  }, [draft.lifeAreaId, lifeAreas]);

  const active = useMemo(
    () => priorities.filter((priority) => !priority.archivedAt),
    [priorities],
  );
  const archived = useMemo(
    () => priorities.filter((priority) => priority.archivedAt),
    [priorities],
  );

  function refresh() {
    router.refresh();
  }

  function persistOrder(nextActive: SerializedFocusPriority[]) {
    const rollback = priorities;
    setPriorities([...nextActive, ...archived]);
    setError(null);
    startTransition(async () => {
      const result = await reorderFocusPrioritiesAction(
        nextActive.map((priority) => priority.id),
      );
      if (!result.success) {
        setPriorities(rollback);
        setError(result.error);
        return;
      }
      setPriorities(result.priorities);
      refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= active.length) {
      return;
    }
    const next = [...active];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    persistOrder(next);
  }

  function handleAdd() {
    if (!draft.title.trim() || !draft.lifeAreaId) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createFocusPriorityAction(toWriteInput(draft));
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDraft(emptyDraft(draft.lifeAreaId));
      refresh();
    });
  }

  function startEdit(priority: SerializedFocusPriority) {
    setEditingId(priority.id);
    setEditDraft(toDraft(priority));
    setError(null);
  }

  function saveEdit() {
    if (!editingId || !editDraft?.title.trim() || !editDraft.lifeAreaId) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateFocusPriorityAction(
        editingId,
        toWriteInput(editDraft),
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      setEditDraft(null);
      refresh();
    });
  }

  return (
    <div className="space-y-3">
      {active.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-soft px-3 py-3 text-sm text-muted">
          No active Focus Priorities.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {active.map((priority, index) => (
            <li
              key={priority.id}
              className="rounded-xl border border-border-soft bg-background px-2 py-2"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 hidden shrink-0 text-muted-light sm:inline-flex"
                  aria-hidden="true"
                >
                  <GripVerticalIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {editingId === priority.id && editDraft ? (
                    <PriorityFields
                      draft={editDraft}
                      lifeAreas={lifeAreas}
                      pending={pending}
                      onChange={setEditDraft}
                    />
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium text-foreground">
                        {priority.title}
                      </p>
                      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                        <LifeAreaColorDot
                          name={priority.lifeAreaName}
                          size="sm"
                        />
                        <span className="truncate">
                          {priority.lifeAreaName}
                          {priority.defaultDurationMinutes
                            ? ` · ${priority.defaultDurationMinutes}m`
                            : ""}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-light">
                        {priority.suggestedTaskTitle}
                      </p>
                      {priority.subtopics.length > 0 ? (
                        <p className="truncate text-xs text-muted-light">
                          {priority.subtopics.join(" · ")}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
                  <button
                    type="button"
                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${priority.title} up`}
                    {...passwordManagerSafeControlProps}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                    disabled={pending || index === active.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${priority.title} down`}
                    {...passwordManagerSafeControlProps}
                  >
                    ↓
                  </button>
                  {editingId === priority.id ? (
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                      disabled={pending}
                      onClick={saveEdit}
                      {...passwordManagerSafeControlProps}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                      disabled={pending}
                      onClick={() => startEdit(priority)}
                      {...passwordManagerSafeControlProps}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const result = await archiveFocusPriorityAction(
                          priority.id,
                        );
                        if (!result.success) {
                          setError(result.error);
                          return;
                        }
                        if (editingId === priority.id) {
                          setEditingId(null);
                          setEditDraft(null);
                        }
                        refresh();
                      });
                    }}
                    {...passwordManagerSafeControlProps}
                  >
                    Archive
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-xl border border-border-soft px-2 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-light">
          Add priority
        </p>
        <PriorityFields
          draft={draft}
          lifeAreas={lifeAreas}
          pending={pending}
          onChange={setDraft}
        />
        <button
          type="button"
          className="ui-btn-secondary min-h-10 w-full sm:w-auto"
          disabled={pending || !draft.title.trim() || !draft.lifeAreaId}
          onClick={handleAdd}
          {...passwordManagerSafeControlProps}
        >
          Add
        </button>
      </div>

      {archived.length > 0 ? (
        <div className="space-y-2 border-t border-border-soft pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-light">
            Archived
          </p>
          <ul className="space-y-1.5">
            {archived.map((priority) => (
              <li
                key={priority.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border-soft px-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted">{priority.title}</p>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-light">
                    <LifeAreaColorDot name={priority.lifeAreaName} size="sm" />
                    <span className="truncate">{priority.lifeAreaName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await restoreFocusPriorityAction(
                        priority.id,
                      );
                      if (!result.success) {
                        setError(result.error);
                        return;
                      }
                      refresh();
                    });
                  }}
                  {...passwordManagerSafeControlProps}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}

function PriorityFields({
  draft,
  lifeAreas,
  pending,
  onChange,
}: {
  draft: DraftFields;
  lifeAreas: SerializedLifeArea[];
  pending: boolean;
  onChange: (next: DraftFields) => void;
}) {
  return (
    <div className="space-y-2">
      <input
        className="ui-input w-full"
        value={draft.title}
        maxLength={MAX_FOCUS_PRIORITY_TITLE_LENGTH}
        disabled={pending}
        placeholder="Priority name"
        aria-label="Priority name"
        onChange={(event) => {
          const title = event.target.value;
          onChange({
            ...draft,
            title,
            suggestedTaskTitle:
              draft.suggestedTaskTitle.trim() === "" ||
              draft.suggestedTaskTitle ===
                defaultSuggestedTaskTitle(draft.title.trim())
                ? defaultSuggestedTaskTitle(title)
                : draft.suggestedTaskTitle,
          });
        }}
        {...passwordManagerSafeControlProps}
      />
      <select
        className="ui-input w-full"
        value={draft.lifeAreaId}
        disabled={pending || lifeAreas.length === 0}
        aria-label="Life Area"
        onChange={(event) =>
          onChange({ ...draft, lifeAreaId: event.target.value })
        }
        {...passwordManagerSafeControlProps}
      >
        {lifeAreas.length === 0 ? (
          <option value="">No Life Areas</option>
        ) : (
          lifeAreas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))
        )}
      </select>
      <textarea
        className="ui-input min-h-20 w-full resize-y"
        value={draft.description}
        maxLength={MAX_FOCUS_PRIORITY_DESCRIPTION_LENGTH}
        disabled={pending}
        placeholder="Description (optional)"
        aria-label="Description"
        onChange={(event) =>
          onChange({ ...draft, description: event.target.value })
        }
        {...passwordManagerSafeControlProps}
      />
      <input
        className="ui-input w-full"
        value={draft.suggestedTaskTitle}
        maxLength={MAX_FOCUS_PRIORITY_TASK_TITLE_LENGTH}
        disabled={pending}
        placeholder="Suggested task title"
        aria-label="Suggested task title"
        onChange={(event) =>
          onChange({ ...draft, suggestedTaskTitle: event.target.value })
        }
        {...passwordManagerSafeControlProps}
      />
      <input
        className="ui-input w-full"
        type="number"
        inputMode="numeric"
        min={1}
        max={1440}
        value={draft.defaultDurationMinutes}
        disabled={pending}
        placeholder="Duration (minutes, optional)"
        aria-label="Default duration in minutes"
        onChange={(event) =>
          onChange({ ...draft, defaultDurationMinutes: event.target.value })
        }
        {...passwordManagerSafeControlProps}
      />
      <textarea
        className="ui-input min-h-16 w-full resize-y"
        value={draft.subtopics}
        disabled={pending}
        placeholder="Subtopics (optional, one per line)"
        aria-label="Subtopics"
        onChange={(event) =>
          onChange({ ...draft, subtopics: event.target.value })
        }
        {...passwordManagerSafeControlProps}
      />
    </div>
  );
}
