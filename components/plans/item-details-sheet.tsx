"use client";

import type {
  ConfidenceLevel,
  ExcitementLevel,
  PlanItemType,
  PriorityLevel,
  SatisfactionLevel,
  TimeHint,
} from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  deletePlanItemAction,
  updatePlanItemAction,
} from "@/app/(app)/plans/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import {
  getPlanItemTypeLabel,
  PRIORITY_LEVEL_LABELS,
  TIME_HINT_LABELS,
} from "@/lib/plan-labels";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type ItemDetailsSheetProps = {
  planId: string;
  item: SerializedPlanItem;
  open: boolean;
  onClose: () => void;
};

const PROGRESS_LEVELS = [0, 25, 50, 75, 100] as const;

const SATISFACTION_LEVELS: SatisfactionLevel[] = [
  "LOW",
  "OKAY",
  "SATISFIED",
  "PROUD",
];

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CERTAIN",
];

const EXCITEMENT_LEVELS: ExcitementLevel[] = [
  "AVOIDING",
  "NEUTRAL",
  "INTERESTED",
  "EXCITED",
];

const PRIORITY_LEVELS: PriorityLevel[] = ["LOW", "MEDIUM", "HIGH"];

const TIME_HINTS: TimeHint[] = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "ANYTIME",
  "ALL_DAY",
  "SPECIFIC",
];

const ITEM_TYPES: PlanItemType[] = [
  "TASK",
  "EVENT",
  "INTENTION",
  "NOTE",
  "WORK_BLOCK",
  "ERRAND",
  "SOCIAL",
  "REST",
];

function buildFormState(item: SerializedPlanItem) {
  return {
    type: item.type,
    progressLevel: item.progressLevel,
    satisfactionLevel: item.satisfactionLevel ?? "",
    confidenceLevel: item.confidenceLevel ?? "",
    excitementLevel: item.excitementLevel ?? "",
    importance: item.importance ?? "",
    urgency: item.urgency ?? "",
    timeHint: item.timeHint ?? "",
    durationMinutes: item.durationMinutes?.toString() ?? "",
    comment: item.comment ?? "",
    shareable: item.shareable,
  };
}

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ItemDetailsSheet({
  planId,
  item,
  open,
  onClose,
}: ItemDetailsSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(() => buildFormState(item));
  const isNote = item.type === "NOTE";
  const isIntention = item.type === "INTENTION";
  const sheetTitle = isNote ? "Note" : isIntention ? "Intention" : "Details";

  useEffect(() => {
    if (open) {
      setForm(buildFormState(item));
    }
  }, [open, item]);

  function handleSave() {
    startTransition(async () => {
      await updatePlanItemAction({
        planId,
        itemId: item.id,
        type: form.type,
        progressLevel: form.progressLevel,
        satisfactionLevel: form.satisfactionLevel
          ? (form.satisfactionLevel as SatisfactionLevel)
          : null,
        confidenceLevel: form.confidenceLevel
          ? (form.confidenceLevel as ConfidenceLevel)
          : null,
        excitementLevel: form.excitementLevel
          ? (form.excitementLevel as ExcitementLevel)
          : null,
        importance: form.importance
          ? (form.importance as PriorityLevel)
          : null,
        urgency: form.urgency ? (form.urgency as PriorityLevel) : null,
        timeHint: form.timeHint ? (form.timeHint as TimeHint) : null,
        durationMinutes: form.durationMinutes
          ? Number.parseInt(form.durationMinutes, 10)
          : null,
        comment: form.comment.trim() || null,
        shareable: form.shareable,
      });
      router.refresh();
      onClose();
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this item?")) return;

    startTransition(async () => {
      await deletePlanItemAction(planId, item.id);
      router.refresh();
      onClose();
    });
  }

  return (
    <SimpleSheet open={open} onClose={onClose} title={sheetTitle}>
      <div className="space-y-6">
        <Field label="Type">
          <select
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value as PlanItemType,
              }))
            }
            className="ui-input min-h-12 py-3"
          >
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {getPlanItemTypeLabel(type)}
              </option>
            ))}
          </select>
        </Field>

        {isNote ? (
          <p className="text-sm text-muted">
            Notes are for reflections and context — not checkable tasks.
          </p>
        ) : null}

        {!isNote ? (
          <>
        <DetailGroup title="Progress">
          <select
            value={form.progressLevel}
            aria-label="Progress"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                progressLevel: Number.parseInt(event.target.value, 10),
              }))
            }
            className="ui-input min-h-12 py-3"
          >
            {PROGRESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
          </select>
        </DetailGroup>

        <DetailGroup title="Feeling">
          <div className="grid gap-4 sm:grid-cols-2">
            <EnumField
              label="Satisfaction"
              value={form.satisfactionLevel}
              options={SATISFACTION_LEVELS}
              onChange={(value) =>
                setForm((current) => ({ ...current, satisfactionLevel: value }))
              }
            />
            <EnumField
              label="Confidence"
              value={form.confidenceLevel}
              options={CONFIDENCE_LEVELS}
              onChange={(value) =>
                setForm((current) => ({ ...current, confidenceLevel: value }))
              }
            />
            <EnumField
              label="Excitement"
              value={form.excitementLevel}
              options={EXCITEMENT_LEVELS}
              onChange={(value) =>
                setForm((current) => ({ ...current, excitementLevel: value }))
              }
            />
          </div>
        </DetailGroup>

        <DetailGroup title="Priority">
          <div className="grid gap-4 sm:grid-cols-2">
            <EnumField
              label="Importance"
              value={form.importance}
              options={PRIORITY_LEVELS}
              labelMap={PRIORITY_LEVEL_LABELS}
              onChange={(value) =>
                setForm((current) => ({ ...current, importance: value }))
              }
            />
            <EnumField
              label="Urgency"
              value={form.urgency}
              options={PRIORITY_LEVELS}
              labelMap={PRIORITY_LEVEL_LABELS}
              onChange={(value) =>
                setForm((current) => ({ ...current, urgency: value }))
              }
            />
          </div>
        </DetailGroup>

        <DetailGroup title="Timing">
          <div className="grid gap-4 sm:grid-cols-2">
            <EnumField
              label="Time hint"
              value={form.timeHint}
              options={TIME_HINTS}
              labelMap={TIME_HINT_LABELS}
              onChange={(value) =>
                setForm((current) => ({ ...current, timeHint: value }))
              }
            />
            <Field label="Duration (minutes)">
              <input
                type="number"
                min={0}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationMinutes: event.target.value,
                  }))
                }
                className="ui-input min-h-12 py-3"
              />
            </Field>
          </div>
        </DetailGroup>
          </>
        ) : null}

        <DetailGroup title="Sharing">
          <label className="flex min-h-12 items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.shareable}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shareable: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-border"
            />
            Include when copying as text
          </label>
        </DetailGroup>

        <DetailGroup title="Notes">
          <Field label="Comment">
            <textarea
              value={form.comment}
              dir="auto"
              rows={3}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  comment: event.target.value,
                }))
              }
              className="ui-textarea min-h-12"
            />
          </Field>
        </DetailGroup>

        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="ui-btn-primary w-full disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save details"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="ui-btn-ghost w-full"
        >
          {isNote ? "Delete note" : isIntention ? "Delete intention" : "Delete item"}
        </button>
      </div>
    </SimpleSheet>
  );
}

function DetailGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border-soft pt-5">
      <h3 className="ui-label">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function EnumField({
  label,
  value,
  options,
  labelMap,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  labelMap?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ui-input min-h-12 py-3"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelMap?.[option] ?? formatEnumLabel(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}
