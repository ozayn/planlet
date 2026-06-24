"use client";

import { useState, useTransition } from "react";

import { updateCoachingReflectionWeeklyLimitAction } from "@/app/(app)/admin/actions";
import {
  MAX_COACHING_REFLECTION_WEEKLY_LIMIT,
  MIN_COACHING_REFLECTION_WEEKLY_LIMIT,
} from "@/lib/app-settings-constants";

type AdminCoachingReflectionLimitSettingProps = {
  initialLimit: number;
};

export function AdminCoachingReflectionLimitSetting({
  initialLimit,
}: AdminCoachingReflectionLimitSettingProps) {
  const [limit, setLimit] = useState(String(initialLimit));
  const [savedLimit, setSavedLimit] = useState(initialLimit);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    const parsed = Number.parseInt(limit, 10);

    if (Number.isNaN(parsed)) {
      setError("Enter a whole number.");
      return;
    }

    startTransition(async () => {
      const result = await updateCoachingReflectionWeeklyLimitAction(parsed);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSavedLimit(result.limit);
      setLimit(String(result.limit));
    });
  }

  return (
    <div className="ui-card-padded space-y-3 border border-border-soft">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          Coaching reflections per week
        </h3>
        <p className="mt-1 text-xs text-muted">
          Applies to non-admin users only. Set to 0 for unlimited. Admin users
          are always unlimited.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="sr-only">Coaching reflections per week</span>
          <input
            id="admin-coaching-reflection-weekly-limit"
            name="coachingReflectionWeeklyLimit"
            type="number"
            min={MIN_COACHING_REFLECTION_WEEKLY_LIMIT}
            max={MAX_COACHING_REFLECTION_WEEKLY_LIMIT}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="ui-input w-24 tabular-nums"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="ui-btn-secondary ui-btn-compact min-h-10 px-4"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>

      {savedLimit === 0 ? (
        <p className="text-xs text-muted">Current setting: unlimited for users.</p>
      ) : (
        <p className="text-xs text-muted">
          Current setting: {savedLimit} per week for non-admin users.
        </p>
      )}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}
