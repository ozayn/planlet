"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { confirmFocusPriorityTaskDraftAction } from "@/app/(app)/focus-priorities/actions";
import { DurationMinutesInput } from "@/components/ui/duration-minutes-input";
import type { SerializedFocusPriority } from "@/lib/focus-priorities/types";
import {
  getMutationError,
  invokeServerAction,
} from "@/lib/invoke-server-action";
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
 * Secondary Focus Priority rows under a Life Area heading.
 * Click a row to open an editable task draft — no separate Add control.
 */
export function LifeAreaFocusPriorities({
  priorities,
  lifeAreas = [],
  canAdd = true,
}: LifeAreaFocusPrioritiesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const areaOptions = useMemo(
    () => lifeAreas.filter((area) => !area.archivedAt),
    [lifeAreas],
  );

  if (priorities.length === 0) {
    return null;
  }

  function startDraft(priority: SerializedFocusPriority) {
    if (!canAdd) {
      return;
    }
    setError(null);
    setSuccess(null);
    setShowAreaPicker(false);
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
    if (!draft || pending) {
      return;
    }
    const title = draft.title.trim();
    if (!title) {
      return;
    }
    const durationRaw = draft.durationMinutes.trim();
    const duration = durationRaw ? Number(durationRaw) : null;
    if (durationRaw && !Number.isFinite(duration)) {
      setError("Enter a valid duration in minutes.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const invoked = await invokeServerAction(() =>
        confirmFocusPriorityTaskDraftAction({
          priorityId: draft.priorityId,
          title,
          durationMinutes: duration,
          primaryLifeAreaId: draft.primaryLifeAreaId || null,
        }),
      );
      const mutationError = getMutationError(invoked);
      if (mutationError) {
        setError(mutationError.message);
        return;
      }
      if (!invoked.ok || !invoked.value.success) {
        setError("Could not add task to today.");
        return;
      }

      const { dayDate } = invoked.value;
      setDraft(null);
      setShowAreaPicker(false);

      const onTodaySurface =
        pathname === "/today" || pathname === `/plans/day/${dayDate}`;

      if (onTodaySurface) {
        setSuccess("Added to today");
        router.refresh();
        return;
      }

      // Task lands on today's Daily Plan — leave week/month/year views.
      router.push("/today");
      router.refresh();
    });
  }

  return (
    <div className="ml-4 space-y-0.5 border-l border-border-soft pl-2.5 sm:ml-5">
      <ul className="space-y-0.5">
        {priorities.map((priority) => {
          const drafting = draft?.priorityId === priority.id;

          return (
            <li key={priority.id} className="space-y-1">
              {drafting && draft ? (
                <div className="space-y-1.5 rounded-lg border border-border-soft px-2 py-2">
                  {priority.description ? (
                    <p className="text-[length:var(--density-text-xs)] leading-snug text-muted-light">
                      {priority.description}
                    </p>
                  ) : null}
                  {priority.subtopics.length > 0 ? (
                    <p className="text-[length:var(--density-text-caption)] text-muted-light">
                      {priority.subtopics.join(" · ")}
                    </p>
                  ) : null}
                  <input
                    className="ui-input w-full text-[length:var(--density-text-sm)]"
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
                        setShowAreaPicker(false);
                      }
                    }}
                    autoFocus
                    {...passwordManagerSafeControlProps}
                  />
                  <DurationMinutesInput
                    value={draft.durationMinutes}
                    disabled={pending}
                    onChange={(durationMinutes) =>
                      setDraft({ ...draft, durationMinutes })
                    }
                  />
                  {showAreaPicker && areaOptions.length > 0 ? (
                    <select
                      className="ui-input w-full text-[length:var(--density-text-sm)]"
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
                  ) : areaOptions.length > 0 ? (
                    <button
                      type="button"
                      className="min-h-11 text-left text-[length:var(--density-text-xs)] font-medium text-muted transition-colors hover:text-foreground"
                      disabled={pending}
                      onClick={() => setShowAreaPicker(true)}
                      {...passwordManagerSafeControlProps}
                    >
                      Change Life Area
                    </button>
                  ) : null}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="ui-btn-secondary min-h-11 px-3 text-[length:var(--density-text-sm)]"
                      disabled={pending || !draft.title.trim()}
                      onClick={confirmDraft}
                      {...passwordManagerSafeControlProps}
                    >
                      {pending ? "Adding…" : "Add to today"}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-lg px-2 text-[length:var(--density-text-xs)] font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                      disabled={pending}
                      onClick={() => {
                        setDraft(null);
                        setShowAreaPicker(false);
                      }}
                      {...passwordManagerSafeControlProps}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center rounded-md px-1.5 text-left text-[length:var(--density-text-sm)] text-muted transition-colors hover:bg-accent-cream/60 hover:text-foreground focus-visible:bg-accent-cream/60 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-subtle)] disabled:opacity-40"
                  disabled={pending || !canAdd}
                  aria-label={`Add ${priority.title} to today`}
                  onClick={() => startDraft(priority)}
                  {...passwordManagerSafeControlProps}
                >
                  <span className="truncate">{priority.title}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="text-[length:var(--density-text-xs)] text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-[length:var(--density-text-xs)] text-muted" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
