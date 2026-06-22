"use client";

import type { TaskOrganizationDisplay } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateTaskOrganizationDisplayAction } from "@/app/(app)/settings/actions";
import { TASK_ORGANIZATION_DISPLAY_OPTIONS } from "@/lib/task-organization-display";

type TaskOrganizationDisplaySettingsProps = {
  value: TaskOrganizationDisplay;
};

export function TaskOrganizationDisplaySettings({
  value,
}: TaskOrganizationDisplaySettingsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextValue: TaskOrganizationDisplay) {
    if (nextValue === selected || isPending) {
      return;
    }

    setError(null);
    setSelected(nextValue);

    startTransition(async () => {
      const result = await updateTaskOrganizationDisplayAction(nextValue);

      if (!result.success) {
        setSelected(value);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <fieldset className="ui-settings-fieldset">
      <legend className="sr-only">Task organization</legend>
      <p className="text-sm font-medium text-foreground">Task organization</p>

      <div className="flex flex-col gap-1.5">
        {TASK_ORGANIZATION_DISPLAY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm transition-colors ${
              selected === option.value ? "ui-segment-active" : "ui-segment"
            }`}
          >
            <input
              id={`task-organization-${option.value}`}
              type="radio"
              name="task-organization-display"
              value={option.value}
              checked={selected === option.value}
              disabled={isPending}
              onChange={() => handleChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>

      <p className="text-xs text-muted-light">
        {
          TASK_ORGANIZATION_DISPLAY_OPTIONS.find(
            (option) => option.value === selected,
          )?.description
        }
      </p>

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
