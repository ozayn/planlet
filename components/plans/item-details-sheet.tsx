"use client";

import type {
  ConfidenceLevel,
  ExcitementLevel,
  PlanItemStatus,
  PlanItemType,
  PriorityLevel,
  SatisfactionLevel,
  TimeHint,
} from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import {
  getPlanItemTypeLabel,
  PRIORITY_LEVEL_LABELS,
  TIME_HINT_LABELS,
} from "@/lib/plan-labels";
import { getStatusLabel } from "@/lib/plan-status";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type ItemDetailsSheetProps = {
  planId: string;
  item: SerializedPlanItem;
  open: boolean;
  onClose: () => void;
  isSubtask?: boolean;
};

const PROGRESS_LEVELS = [0, 25, 50, 75, 100] as const;

const STATUS_LEVELS: PlanItemStatus[] = [
  "OPEN",
  "DONE",
  "PARTIAL",
  "MOVED",
  "SKIPPED",
  "RELEASED",
];

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
    title: item.title,
    type: item.type,
    status: item.status,
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
  isSubtask = false,
}: ItemDetailsSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(() => buildFormState(item));
  const labels = getItemActionLabels(item.type, isSubtask);
  const isNote = form.type === "NOTE";

  useEffect(() => {
    if (open) {
      setForm(buildFormState(item));
    }
  }, [open, item]);

  function handleCancel() {
    setForm(buildFormState(item));
    onClose();
  }

  function handleSave() {
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      return;
    }

    startTransition(async () => {
      await updatePlanItemAction({
        planId,
        itemId: item.id,
        title: trimmedTitle,
        type: form.type,
        status: isNote ? undefined : form.status,
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

  const titleFieldId = `item-title-${item.id}`;
  const typeFieldId = `item-type-${item.id}`;
  const statusFieldId = `item-status-${item.id}`;
  const progressFieldId = `item-progress-${item.id}`;
  const durationFieldId = `item-duration-${item.id}`;
  const shareableFieldId = `item-shareable-${item.id}`;
  const commentFieldId = `task-note-${item.id}`;

  return (
    <SimpleSheet
      open={open}
      onClose={handleCancel}
      title={labels.sheetTitle}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isPending}
            onClick={handleCancel}
            className="ui-btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending || !form.title.trim()}
            onClick={handleSave}
            className="ui-btn-primary flex-1 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <Field label="Title" fieldId={titleFieldId}>
          {isNote ? (
            <textarea
              id={titleFieldId}
              name={`itemTitle-${item.id}`}
              value={form.title}
              dir="auto"
              rows={4}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="ui-textarea min-h-24"
            />
          ) : (
            <input
              id={titleFieldId}
              name={`itemTitle-${item.id}`}
              type="text"
              value={form.title}
              dir="auto"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="ui-input min-h-12 py-3"
            />
          )}
        </Field>

        <Field label="Type" fieldId={typeFieldId}>
          <select
            id={typeFieldId}
            name={`itemType-${item.id}`}
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

        {form.type === "NOTE" ? (
          <p className="text-sm text-muted">
            Notes are for reflections and context — not checkable tasks.
          </p>
        ) : null}

        {!isNote ? (
          <>
            <Field label="Status" fieldId={statusFieldId}>
              <select
                id={statusFieldId}
                name={`itemStatus-${item.id}`}
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as PlanItemStatus,
                  }))
                }
                className="ui-input min-h-12 py-3"
              >
                {STATUS_LEVELS.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </Field>

            <DetailGroup title="Progress">
              <select
                id={progressFieldId}
                name={`itemProgress-${item.id}`}
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
                  fieldId={`item-satisfaction-${item.id}`}
                  value={form.satisfactionLevel}
                  options={SATISFACTION_LEVELS}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      satisfactionLevel: value,
                    }))
                  }
                />
                <EnumField
                  label="Confidence"
                  fieldId={`item-confidence-${item.id}`}
                  value={form.confidenceLevel}
                  options={CONFIDENCE_LEVELS}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      confidenceLevel: value,
                    }))
                  }
                />
                <EnumField
                  label="Excitement"
                  fieldId={`item-excitement-${item.id}`}
                  value={form.excitementLevel}
                  options={EXCITEMENT_LEVELS}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      excitementLevel: value,
                    }))
                  }
                />
              </div>
            </DetailGroup>

            <DetailGroup title="Priority">
              <div className="grid gap-4 sm:grid-cols-2">
                <EnumField
                  label="Importance"
                  fieldId={`item-importance-${item.id}`}
                  value={form.importance}
                  options={PRIORITY_LEVELS}
                  labelMap={PRIORITY_LEVEL_LABELS}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, importance: value }))
                  }
                />
                <EnumField
                  label="Urgency"
                  fieldId={`item-urgency-${item.id}`}
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
                  fieldId={`item-time-hint-${item.id}`}
                  value={form.timeHint}
                  options={TIME_HINTS}
                  labelMap={TIME_HINT_LABELS}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, timeHint: value }))
                  }
                />
                <Field label="Duration (minutes)" fieldId={durationFieldId}>
                  <input
                    id={durationFieldId}
                    name={`itemDuration-${item.id}`}
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
          <label
            htmlFor={shareableFieldId}
            className="flex min-h-12 items-center gap-3 text-sm text-foreground"
          >
            <input
              id={shareableFieldId}
              name={`itemShareable-${item.id}`}
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
          <Field label="Comment" fieldId={commentFieldId}>
            <textarea
              id={commentFieldId}
              name={`taskNote-${item.id}`}
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
  fieldId,
  children,
}: {
  label: string;
  fieldId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block space-y-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function EnumField({
  label,
  fieldId,
  value,
  options,
  labelMap,
  onChange,
}: {
  label: string;
  fieldId: string;
  value: string;
  options: readonly string[];
  labelMap?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} fieldId={fieldId}>
      <select
        id={fieldId}
        name={fieldId}
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
