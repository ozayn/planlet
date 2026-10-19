"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanOrganizeViewAction } from "@/app/(app)/life-areas/actions";
import type { PlanOrganizeViewValue } from "@/lib/life-areas/types";

type PlanOrganizeViewToggleProps = {
  value: PlanOrganizeViewValue;
};

const OPTIONS: Array<{ value: PlanOrganizeViewValue; label: string }> = [
  { value: "LIST", label: "List" },
  { value: "LIFE_AREAS", label: "Life Areas" },
];

export function PlanOrganizeViewToggle({ value }: PlanOrganizeViewToggleProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelected(value);
  }, [value]);

  function handleChange(next: PlanOrganizeViewValue) {
    if (next === selected || pending) {
      return;
    }
    setSelected(next);
    startTransition(async () => {
      const result = await updatePlanOrganizeViewAction(next);
      if (!result.success) {
        setSelected(value);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex rounded-lg border border-border-soft p-0.5"
      role="group"
      aria-label="Plan organization"
    >
      {OPTIONS.map((option) => {
        const active = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={pending}
            aria-pressed={active}
            onClick={() => handleChange(option.value)}
            className={`min-h-9 min-w-[5.5rem] rounded-md px-3 text-sm transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
