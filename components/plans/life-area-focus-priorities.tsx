"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { confirmFocusPriorityTaskDraftAction } from "@/app/(app)/focus-priorities/actions";
import { LifeAreaColorDot } from "@/components/plans/life-area-color-dot";
import type { SerializedFocusPriority } from "@/lib/focus-priorities/types";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LifeAreaFocusPrioritiesProps = {
  priorities: SerializedFocusPriority[];
  lifeAreas?: SerializedLifeArea[];
  canAdd?: boolean;
};

type DraftState = {
  priorityId: string;
  title: string;
  durationMinutes: string;
  primaryLifeAreaId: string;
};

/**
 * Compact quiet suggestions under a Life Area heading.
 * Not tasks — excluded from task counts and status tallies.
 */
export function LifeAreaFocusPriorities({
  priorities,
  lifeAreas = [],
  canAdd = true,
}: LifeAreaFocusPrioritiesProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const areaOptions = useMemo(
    () => lifeAreas.filter((area) => !area.archivedAt),
    [lifeAreas],
  );

  if (priorities.length === 0) {
    return null;
  }

  function startDraft(priority: SerializedFocusPriority) {
    setError(null);
    setExpandedId(priority.id);
    setDraft({
      priorityId: priority.id,
      title: priority.suggestedTaskTitle,
      durationMinutes:
        priority.defaultDurationMinutes == null
          ? ""
          : String(priority.defaultDurationMinutes),
      primaryLifeAreaId: priority.lifeAreaId,
    });
  }

  function confirmDraft() {
    if (!draft) {
      return;
    }
    const title = draft.title.trim();
    if (!title) {
      return;
    }
    const duration = draft.durationMinutes.trim()
      ? Number(draft.durationMinutes)
      : null;
    setError(null);
    startTransition(async () => {
      const result = await confirmFocusPriorityTaskDraftAction({
        priorityId: draft.priorityId,
        title,
        durationMinutes: Number.isFinite(duration) ? duration : null,
        primaryLifeAreaId: draft.primaryLifeAreaId || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1 px-0.5">
      <p className="text-[0.6875rem] text-muted-light">Priorities</p>
      <ul className="space-y-0.5">
        {priorities.map((priority) => {
          const expanded = expandedId === priority.id;
          const drafting = draft?.priorityId === priority.id;

          return (
            <li key={priority.id} className="space-y-1">
              <div className="flex min-h-9 items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs text-muted transition-colors hover:text-foreground"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedId((current) =>
                      current === priority.id ? null : priority.id,
                    )
                  }
                  {...passwordManagerSafeControlProps}
                >
                  <LifeAreaColorDot
                    name={priority.lifeAreaName}
                    size="sm"
                  />
                  <span className="truncate">{priority.title}</span>
                </button>
                {canAdd ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-md px-1.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                    disabled={pending}
                    aria-label={`Add ${priority.title} to today`}
                    onClick={() => startDraft(priority)}
                    {...passwordManagerSafeControlProps}
                  >
                    + Add
                  </button>
                ) : null}
              </div>

              {expanded && !drafting ? (
                <div className="space-y-1 pb-1 pl-0.5">
                  {priority.description ? (
                    <p className="text-xs leading-relaxed text-muted-light">
                      {priority.description}
                    </p>
                  ) : null}
                  {priority.subtopics.length > 0 ? (
                    <p className="text-xs text-muted-light">
                      {priority.subtopics.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {drafting && draft ? (
                <div className="space-y-1.5 rounded-lg border border-border-soft px-2 py-2">
                  <input
                    className="ui-input w-full text-sm"
                    value={draft.title}
                    disabled={pending}
                    aria-label="Task title"
                    onChange={(event) =>
                      setDraft({ ...draft, title: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmDraft();
                      }
                      if (event.key === "Escape") {
                        setDraft(null);
                      }
                    }}
                    autoFocus
                    {...passwordManagerSafeControlProps}
                  />
                  <div className="flex flex-col gap-1.5 sm:flex-row">
                    <input
                      className="ui-input w-full text-sm sm:w-28"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={1440}
                      value={draft.durationMinutes}
                      disabled={pending}
                      placeholder="Minutes"
                      aria-label="Duration in minutes"
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          durationMinutes: event.target.value,
                        })
                      }
                      {...passwordManagerSafeControlProps}
                    />
                    {areaOptions.length > 0 ? (
                      <select
                        className="ui-input min-w-0 flex-1 text-sm"
                        value={draft.primaryLifeAreaId}
                        disabled={pending}
                        aria-label="Life Area"
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            primaryLifeAreaId: event.target.value,
                          })
                        }
                        {...passwordManagerSafeControlProps}
                      >
                        {areaOptions.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="ui-btn-secondary min-h-9 px-3 text-sm"
                      disabled={pending || !draft.title.trim()}
                      onClick={confirmDraft}
                      {...passwordManagerSafeControlProps}
                    >
                      Save to today
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                      disabled={pending}
                      onClick={() => setDraft(null)}
                      {...passwordManagerSafeControlProps}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-xs text-accent-red">{error}</p> : null}
    </div>
  );
}
