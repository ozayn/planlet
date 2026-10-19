"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setPlanItemLifeAreasAction } from "@/app/(app)/life-areas/actions";
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  const activeAreas = useMemo(
    () => lifeAreas.filter((area) => !area.archivedAt),
    [lifeAreas],
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

  const summary =
    item.lifeAreas.find((area) => area.isPrimary)?.name ?? "None";

  return (
    <div className="space-y-2 border-t border-border-soft pt-3">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="text-muted">Life Area</span>
        <span className="truncate text-foreground">
          {summary}
          <span className="ml-2 text-muted" aria-hidden="true">
            {expanded ? "▾" : "▸"}
          </span>
        </span>
      </button>

      {expanded ? (
        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted">Primary</span>
            <select
              className="ui-input w-full"
              value={primary}
              disabled={pending || activeAreas.length === 0}
              onChange={(event) => {
                const nextPrimary = event.target.value;
                const nextSecondaries = secondaries.filter(
                  (id) => id !== nextPrimary,
                );
                setPrimary(nextPrimary);
                setSecondaries(nextSecondaries);
                persist(nextPrimary, nextSecondaries);
              }}
              {...passwordManagerSafeControlProps}
            >
              <option value="">None</option>
              {activeAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>

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
          ) : (
            <button
              type="button"
              className="text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40"
              disabled={!primary || pending}
              onClick={() => setShowSecondary(true)}
            >
              + Add another area
            </button>
          )}

          {error ? <p className="text-sm text-accent-red">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
