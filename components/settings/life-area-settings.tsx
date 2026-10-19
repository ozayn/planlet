"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  archiveLifeAreaAction,
  createLifeAreaAction,
  renameLifeAreaAction,
  reorderLifeAreasAction,
  restoreLifeAreaAction,
} from "@/app/(app)/life-areas/actions";
import { GripVerticalIcon } from "@/components/ui/action-icons";
import { MAX_LIFE_AREA_NAME_LENGTH } from "@/lib/life-areas/constants";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LifeAreaSettingsProps = {
  areas: SerializedLifeArea[];
};

export function LifeAreaSettings({ areas: initial }: LifeAreaSettingsProps) {
  const router = useRouter();
  const [areas, setAreas] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setAreas(initial);
  }, [initial]);

  const active = areas.filter((area) => !area.archivedAt);
  const archived = areas.filter((area) => area.archivedAt);

  function refresh() {
    router.refresh();
  }

  function persistOrder(nextActive: SerializedLifeArea[]) {
    const rollback = areas;
    setAreas([...nextActive, ...archived]);
    setError(null);
    startTransition(async () => {
      const result = await reorderLifeAreasAction(
        nextActive.map((area) => area.id),
      );
      if (!result.success) {
        setAreas(rollback);
        setError(result.error);
        return;
      }
      setAreas(result.areas);
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
    const name = draft.trim();
    if (!name) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createLifeAreaAction(name);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDraft("");
      refresh();
    });
  }

  function saveRename() {
    if (!editingId) {
      return;
    }
    const name = editingName.trim();
    if (!name) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await renameLifeAreaAction(editingId, name);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      refresh();
    });
  }

  return (
    <div className="space-y-3">
      {active.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-soft px-3 py-3 text-sm text-muted">
          No active Life Areas.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {active.map((area, index) => (
            <li
              key={area.id}
              className="flex items-start gap-2 rounded-xl border border-border-soft bg-background px-2 py-2"
            >
              <span
                className="mt-1 hidden shrink-0 text-muted-light sm:inline-flex"
                aria-hidden="true"
              >
                <GripVerticalIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                {editingId === area.id ? (
                  <input
                    className="ui-input w-full"
                    value={editingName}
                    maxLength={MAX_LIFE_AREA_NAME_LENGTH}
                    disabled={pending}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveRename();
                      }
                      if (event.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                    {...passwordManagerSafeControlProps}
                  />
                ) : (
                  <p className="truncate text-sm font-medium text-foreground">
                    {area.name}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
                <button
                  type="button"
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move ${area.name} up`}
                  {...passwordManagerSafeControlProps}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-cream hover:text-foreground disabled:opacity-40"
                  disabled={pending || index === active.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move ${area.name} down`}
                  {...passwordManagerSafeControlProps}
                >
                  ↓
                </button>
                {editingId === area.id ? (
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                    disabled={pending}
                    onClick={saveRename}
                    {...passwordManagerSafeControlProps}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                    disabled={pending}
                    onClick={() => {
                      setEditingId(area.id);
                      setEditingName(area.name);
                    }}
                    {...passwordManagerSafeControlProps}
                  >
                    Rename
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await archiveLifeAreaAction(area.id);
                      if (!result.success) {
                        setError(result.error);
                        return;
                      }
                      refresh();
                    });
                  }}
                  {...passwordManagerSafeControlProps}
                >
                  Archive
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="ui-input min-w-0 flex-1"
          value={draft}
          maxLength={MAX_LIFE_AREA_NAME_LENGTH}
          disabled={pending}
          placeholder="New Life Area"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
          aria-label="New Life Area name"
          {...passwordManagerSafeControlProps}
        />
        <button
          type="button"
          className="ui-btn-secondary min-h-10 shrink-0"
          disabled={pending || !draft.trim()}
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
            {archived.map((area) => (
              <li
                key={area.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border-soft px-2 py-2"
              >
                <p className="min-w-0 truncate text-sm text-muted">{area.name}</p>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await restoreLifeAreaAction(area.id);
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
