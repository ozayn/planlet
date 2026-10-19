"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createLifeAreaAction,
  setPlanItemLifeAreasAction,
} from "@/app/(app)/life-areas/actions";
import { MAX_LIFE_AREA_NAME_LENGTH } from "@/lib/life-areas/constants";
import type { SerializedLifeArea } from "@/lib/life-areas/types";
import type { SerializedPlanItem } from "@/lib/plan-serialize";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ItemLifeAreaPickerProps = {
  planId: string;
  item: SerializedPlanItem;
  lifeAreas: SerializedLifeArea[];
};

export function ItemLifeAreaPicker({
  planId,
  item,
  lifeAreas,
}: ItemLifeAreaPickerProps) {
  const router = useRouter();
  const selectId = useId();
  const createFieldId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [areas, setAreas] = useState(lifeAreas);

  useEffect(() => {
    setAreas(lifeAreas);
  }, [lifeAreas]);

  const activeAreas = useMemo(
    () => areas.filter((area) => !area.archivedAt),
    [areas],
  );

  const [primary, setPrimary] = useState(
    () => item.lifeAreas.find((area) => area.isPrimary)?.id ?? "",
  );
  const [secondaries, setSecondaries] = useState<string[]>(() =>
    item.lifeAreas.filter((area) => !area.isPrimary).map((area) => area.id),
  );

  useEffect(() => {
    const nextPrimary =
      item.lifeAreas.find((area) => area.isPrimary)?.id ?? "";
    const nextSecondaries = item.lifeAreas
      .filter((area) => !area.isPrimary)
      .map((area) => area.id);
    setPrimary(nextPrimary);
    setSecondaries(nextSecondaries);
    setShowSecondary(nextSecondaries.length > 0);
  }, [item]);

  function persist(nextPrimary: string, nextSecondaries: string[]) {
    setError(null);
    startTransition(async () => {
      const result = await setPlanItemLifeAreasAction({
        planId,
        itemId: item.id,
        primaryLifeAreaId: nextPrimary || null,
        secondaryLifeAreaIds: nextSecondaries,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function createAndAssign() {
    const name = newName.trim();
    if (!name) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const created = await createLifeAreaAction(name);
      if (!created.success) {
        setError(created.error);
        return;
      }

      const nextSecondaries = secondaries.filter(
        (id) => id !== created.area.id,
      );
      setAreas((current) => {
        if (current.some((area) => area.id === created.area.id)) {
          return current;
        }
        return [...current, created.area];
      });
      setPrimary(created.area.id);
      setSecondaries(nextSecondaries);
      setNewName("");
      setCreating(false);

      const assigned = await setPlanItemLifeAreasAction({
        planId,
        itemId: item.id,
        primaryLifeAreaId: created.area.id,
        secondaryLifeAreaIds: nextSecondaries,
      });
      if (!assigned.success) {
        setError(assigned.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-foreground"
        >
          Life Area
        </label>
        <select
          id={selectId}
          className="ui-input w-full min-h-12 py-3"
          value={primary}
          disabled={pending}
          aria-label="Life Area"
          onChange={(event) => {
            const nextPrimary = event.target.value;
            const nextSecondaries = secondaries.filter(
              (id) => id !== nextPrimary,
            );
            setPrimary(nextPrimary);
            setSecondaries(nextSecondaries);
            if (!nextPrimary) {
              setShowSecondary(false);
            }
            persist(nextPrimary, nextSecondaries);
          }}
          {...passwordManagerSafeControlProps}
        >
          <option value="">Select an area</option>
          {activeAreas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      {showSecondary && primary ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted">Also related</p>
          <ul className="space-y-1">
            {activeAreas
              .filter((area) => area.id !== primary)
              .map((area) => {
                const checked = secondaries.includes(area.id);
                return (
                  <li key={area.id}>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-foreground"
                        checked={checked}
                        disabled={pending}
                        onChange={() => {
                          const next = checked
                            ? secondaries.filter((id) => id !== area.id)
                            : [...secondaries, area.id];
                          setSecondaries(next);
                          persist(primary, next);
                        }}
                        {...passwordManagerSafeControlProps}
                      />
                      <span className="text-foreground">{area.name}</span>
                    </label>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : primary ? (
        <button
          type="button"
          className="min-h-11 text-left text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40"
          disabled={pending}
          onClick={() => setShowSecondary(true)}
        >
          + Add another area
        </button>
      ) : null}

      {creating ? (
        <div className="space-y-2 rounded-xl border border-border-soft p-2">
          <label className="block space-y-1 text-sm" htmlFor={createFieldId}>
            <span className="text-xs text-muted">New Life Area</span>
            <input
              id={createFieldId}
              className="ui-input w-full min-h-11"
              value={newName}
              maxLength={MAX_LIFE_AREA_NAME_LENGTH}
              disabled={pending}
              placeholder="Name"
              autoFocus
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createAndAssign();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setCreating(false);
                  setNewName("");
                }
              }}
              {...passwordManagerSafeControlProps}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="ui-btn-secondary min-h-11 flex-1"
              disabled={pending || !newName.trim()}
              onClick={createAndAssign}
              {...passwordManagerSafeControlProps}
            >
              Create
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-accent-cream hover:text-foreground"
              disabled={pending}
              onClick={() => {
                setCreating(false);
                setNewName("");
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
          className="min-h-11 w-full text-left text-sm text-muted transition-colors hover:text-foreground disabled:opacity-40"
          disabled={pending}
          onClick={() => setCreating(true)}
          {...passwordManagerSafeControlProps}
        >
          + Create new Life Area
        </button>
      )}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}
