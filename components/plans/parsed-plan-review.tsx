"use client";

import type {
  ParsedPlan,
  ParsedPlanItem,
  ParsedSubtask,
} from "@/lib/ai/plan-parser-schema";
import {
  formatPlanDateLabel,
  getWeekRange,
  parseDateString,
} from "@/lib/dates";
import {
  dateStringToMonthValue,
  dateStringToYearValue,
  formatPlanForLabel,
  monthValueToDateString,
  yearValueToDateString,
} from "@/lib/plan-target";
import {
  getPlanItemTypeLabel,
  getPlanTypeLabel,
  PLAN_LANGUAGE_LABELS,
  PRIORITY_LEVEL_LABELS,
  TIME_HINT_LABELS,
} from "@/lib/plan-labels";
import {
  getStatusLabel,
  PLAN_ITEM_STATUS_ORDER,
} from "@/lib/plan-status";

const PLAN_TYPES = ["DAY", "WEEK", "MONTH", "YEAR"] as const;
const LANGUAGES = ["FA", "EN", "MIXED", "UNKNOWN"] as const;
const ITEM_TYPES = [
  "TASK",
  "EVENT",
  "INTENTION",
  "NOTE",
  "WORK_BLOCK",
  "ERRAND",
  "SOCIAL",
  "REST",
] as const;
const TIME_HINTS = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "ANYTIME",
  "ALL_DAY",
  "SPECIFIC",
] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const ITEM_STATUSES = PLAN_ITEM_STATUS_ORDER;

const inputClass = "ui-input min-h-11 py-2";

const selectClass =
  "min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10";

type ImageDateHintContext = {
  rawText: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  explanation?: string;
};

type ParsedPlanReviewProps = {
  draft: ParsedPlan;
  onChange: (draft: ParsedPlan) => void;
  planDate?: string;
  onPlanDateChange?: (planDate: string) => void;
  existingDayPlan?: boolean;
  existingWeekPlan?: boolean;
  existingMonthPlan?: boolean;
  existingYearPlan?: boolean;
  imageDateHint?: ImageDateHintContext | null;
  showPlanForSummary?: boolean;
  detectedHeader?: string | null;
};

export function ParsedPlanReview({
  draft,
  onChange,
  planDate,
  onPlanDateChange,
  existingDayPlan = false,
  existingWeekPlan = false,
  existingMonthPlan = false,
  existingYearPlan = false,
  imageDateHint = null,
  showPlanForSummary = false,
  detectedHeader = null,
}: ParsedPlanReviewProps) {
  function updateItem(index: number, item: ParsedPlanItem) {
    const items = [...draft.items];
    items[index] = item;
    onChange({ ...draft, items });
  }

  function removeItem(index: number) {
    onChange({
      ...draft,
      items: draft.items.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function addItem() {
    onChange({
      ...draft,
      items: [
        ...draft.items,
        {
          title: "",
          type: "TASK",
          shareable: true,
          subtasks: [],
        },
      ],
    });
  }

  let weekPeriodLabel: string | null = null;
  if (draft.planType === "WEEK" && planDate) {
    const { start, end } = getWeekRange(parseDateString(planDate));
    weekPeriodLabel = formatPlanDateLabel(start, "WEEK", end);
  }

  const planForLabel =
    planDate && showPlanForSummary
      ? formatPlanForLabel(draft.planType, planDate)
      : null;

  return (
    <div className="space-y-6">
      {planForLabel ? (
        <p className="text-sm text-muted">
          Plan for:{" "}
          <span className="font-medium text-foreground">{planForLabel}</span>
        </p>
      ) : null}

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <Field label="Plan title" fieldId="review-plan-title">
          <input
            id="review-plan-title"
            name="reviewPlanTitle"
            type="text"
            dir="auto"
            value={draft.title}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
            className={inputClass}
          />
          <p className="text-xs text-muted-light">
            Generated from the selected date. You can rename it.
          </p>
          {detectedHeader ? (
            <p className="text-xs text-muted">
              Detected header:{" "}
              <span dir="auto" className="text-foreground">
                {detectedHeader}
              </span>
            </p>
          ) : null}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan type" fieldId="review-plan-type">
            <select
              id="review-plan-type"
              name="reviewPlanType"
              value={draft.planType}
              onChange={(event) =>
                onChange({
                  ...draft,
                  planType: event.target.value as ParsedPlan["planType"],
                })
              }
              className={`${selectClass} w-full`}
            >
              {PLAN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getPlanTypeLabel(type)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Language" fieldId="review-plan-language">
            <select
              id="review-plan-language"
              name="reviewPlanLanguage"
              value={draft.language}
              onChange={(event) =>
                onChange({
                  ...draft,
                  language: event.target.value as ParsedPlan["language"],
                })
              }
              className={`${selectClass} w-full`}
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {PLAN_LANGUAGE_LABELS[language]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Summary" fieldId="review-plan-summary">
          <textarea
            id="review-plan-summary"
            name="reviewPlanSummary"
            dir="auto"
            rows={2}
            value={draft.summary ?? ""}
            onChange={(event) =>
              onChange({ ...draft, summary: event.target.value })
            }
            className={`${inputClass} resize-y`}
          />
        </Field>

        {draft.planType === "DAY" && planDate && onPlanDateChange ? (
          <div className="space-y-2 border-t border-border-soft pt-4">
            <Field label="Plan date" fieldId="review-plan-date">
              <input
                id="review-plan-date"
                name="reviewPlanDate"
                type="date"
                value={planDate}
                onChange={(event) => onPlanDateChange(event.target.value)}
                className={inputClass}
              />
            </Field>
            <p className="text-sm text-muted">
              Plan date: {formatPlanDateLabel(parseDateString(planDate), "DAY")}
            </p>
            {imageDateHint ? (
              <p className="text-sm text-muted">
                From image: {imageDateHint.rawText}
                {imageDateHint.confidence === "LOW"
                  ? " (please confirm)"
                  : ""}
              </p>
            ) : null}
            {existingDayPlan ? (
              <p className="text-sm text-muted">
                This will be added to the existing plan for this date.
              </p>
            ) : null}
          </div>
        ) : null}

        {draft.planType === "WEEK" && planDate && onPlanDateChange ? (
          <div className="space-y-2 border-t border-border-soft pt-4">
            <Field label="Week containing" fieldId="review-plan-week">
              <input
                id="review-plan-week"
                name="reviewPlanWeek"
                type="date"
                value={planDate}
                onChange={(event) => onPlanDateChange(event.target.value)}
                className={inputClass}
              />
            </Field>
            <p className="text-sm text-muted">Week: {weekPeriodLabel}</p>
            {existingWeekPlan ? (
              <p className="text-sm text-muted">
                This will be added to the existing plan for this week.
              </p>
            ) : null}
          </div>
        ) : null}

        {draft.planType === "MONTH" && planDate && onPlanDateChange ? (
          <div className="space-y-2 border-t border-border-soft pt-4">
            <Field label="Month" fieldId="review-plan-month">
              <input
                id="review-plan-month"
                name="reviewPlanMonth"
                type="month"
                value={dateStringToMonthValue(planDate)}
                onChange={(event) =>
                  onPlanDateChange(monthValueToDateString(event.target.value))
                }
                className={inputClass}
              />
            </Field>
            <p className="text-sm text-muted">
              Month: {formatPlanDateLabel(parseDateString(planDate), "MONTH")}
            </p>
            {existingMonthPlan ? (
              <p className="text-sm text-muted">
                This will be added to the existing plan for this month.
              </p>
            ) : null}
          </div>
        ) : null}

        {draft.planType === "YEAR" && planDate && onPlanDateChange ? (
          <div className="space-y-2 border-t border-border-soft pt-4">
            <Field label="Year" fieldId="review-plan-year">
              <input
                id="review-plan-year"
                name="reviewPlanYear"
                type="number"
                min={2000}
                max={2100}
                step={1}
                value={dateStringToYearValue(planDate)}
                onChange={(event) =>
                  onPlanDateChange(yearValueToDateString(event.target.value))
                }
                className={inputClass}
              />
            </Field>
            <p className="text-sm text-muted">
              Year: {formatPlanDateLabel(parseDateString(planDate), "YEAR")}
            </p>
            {existingYearPlan ? (
              <p className="text-sm text-muted">
                This will be added to the existing plan for this year.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="min-h-10 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-accent-cream"
          >
            Add item
          </button>
        </div>

        {draft.items.map((item, index) => (
          <ReviewItemCard
            key={index}
            itemIndex={index}
            item={item}
            onChange={(updated) => updateItem(index, updated)}
            onDelete={() => removeItem(index)}
          />
        ))}
      </div>
    </div>
  );
}

function ReviewItemCard({
  itemIndex,
  item,
  onChange,
  onDelete,
}: {
  itemIndex: number;
  item: ParsedPlanItem;
  onChange: (item: ParsedPlanItem) => void;
  onDelete: () => void;
}) {
  const itemPrefix = `review-item-${itemIndex}`;
  function updateSubtask(subIndex: number, subtask: ParsedSubtask) {
    const subtasks = [...(item.subtasks ?? [])];
    subtasks[subIndex] = subtask;
    onChange({ ...item, subtasks });
  }

  function removeSubtask(subIndex: number) {
    onChange({
      ...item,
      subtasks: (item.subtasks ?? []).filter(
        (_, index) => index !== subIndex,
      ),
    });
  }

  function addSubtask() {
    onChange({
      ...item,
      subtasks: [...(item.subtasks ?? []), { title: "", type: "TASK" }],
    });
  }

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <Field label="Title" fieldId={`${itemPrefix}-title`}>
        <input
          id={`${itemPrefix}-title`}
          name={`${itemPrefix}-title`}
          type="text"
          dir="auto"
          value={item.title}
          onChange={(event) => onChange({ ...item, title: event.target.value })}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" fieldId={`${itemPrefix}-type`}>
          <select
            id={`${itemPrefix}-type`}
            name={`${itemPrefix}-type`}
            value={item.type}
            onChange={(event) =>
              onChange({
                ...item,
                type: event.target.value as ParsedPlanItem["type"],
              })
            }
            className={`${selectClass} w-full`}
          >
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {getPlanItemTypeLabel(type)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status" fieldId={`${itemPrefix}-status`}>
          <select
            id={`${itemPrefix}-status`}
            name={`${itemPrefix}-status`}
            value={item.status ?? "OPEN"}
            onChange={(event) =>
              onChange({
                ...item,
                status: event.target.value as NonNullable<ParsedPlanItem["status"]>,
              })
            }
            className={`${selectClass} w-full`}
          >
            {ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Time hint" fieldId={`${itemPrefix}-time-hint`}>
          <select
            id={`${itemPrefix}-time-hint`}
            name={`${itemPrefix}-time-hint`}
            value={item.timeHint ?? ""}
            onChange={(event) =>
              onChange({
                ...item,
                timeHint: event.target.value
                  ? (event.target.value as NonNullable<ParsedPlanItem["timeHint"]>)
                  : undefined,
              })
            }
            className={`${selectClass} w-full`}
          >
            <option value="">—</option>
            {TIME_HINTS.map((hint) => (
              <option key={hint} value={hint}>
                {TIME_HINT_LABELS[hint]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Importance" fieldId={`${itemPrefix}-importance`}>
          <select
            id={`${itemPrefix}-importance`}
            name={`${itemPrefix}-importance`}
            value={item.importance ?? ""}
            onChange={(event) =>
              onChange({
                ...item,
                importance: event.target.value
                  ? (event.target.value as NonNullable<ParsedPlanItem["importance"]>)
                  : undefined,
              })
            }
            className={`${selectClass} w-full`}
          >
            <option value="">—</option>
            {PRIORITIES.map((level) => (
              <option key={level} value={level}>
                {PRIORITY_LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Urgency" fieldId={`${itemPrefix}-urgency`}>
          <select
            id={`${itemPrefix}-urgency`}
            name={`${itemPrefix}-urgency`}
            value={item.urgency ?? ""}
            onChange={(event) =>
              onChange({
                ...item,
                urgency: event.target.value
                  ? (event.target.value as NonNullable<ParsedPlanItem["urgency"]>)
                  : undefined,
              })
            }
            className={`${selectClass} w-full`}
          >
            <option value="">—</option>
            {PRIORITIES.map((level) => (
              <option key={level} value={level}>
                {PRIORITY_LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label
        htmlFor={`${itemPrefix}-shareable`}
        className="flex min-h-10 items-center gap-3 text-sm text-foreground"
      >
        <input
          id={`${itemPrefix}-shareable`}
          name={`${itemPrefix}-shareable`}
          type="checkbox"
          checked={item.shareable ?? true}
          onChange={(event) =>
            onChange({ ...item, shareable: event.target.checked })
          }
          className="h-5 w-5 rounded border-border"
        />
        Include when copying as text
      </label>

      <div className="space-y-2 border-t border-border-soft pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Subtasks
          </span>
          <button
            type="button"
            onClick={addSubtask}
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            Add subtask
          </button>
        </div>
        {(item.subtasks ?? []).map((subtask, subIndex) => (
          <div key={subIndex} className="flex gap-2">
            <input
              id={`${itemPrefix}-subtask-${subIndex}`}
              name={`${itemPrefix}-subtask-${subIndex}`}
              type="text"
              dir="auto"
              value={subtask.title}
              onChange={(event) =>
                updateSubtask(subIndex, { ...subtask, title: event.target.value })
              }
              className={`${inputClass} flex-1`}
              placeholder="Subtask"
              aria-label={`Subtask ${subIndex + 1}`}
            />
            <select
              id={`${itemPrefix}-subtask-type-${subIndex}`}
              name={`${itemPrefix}-subtask-type-${subIndex}`}
              value={subtask.type ?? "TASK"}
              onChange={(event) =>
                updateSubtask(subIndex, {
                  ...subtask,
                  type: event.target.value as ParsedSubtask["type"],
                })
              }
              className={selectClass}
              aria-label={`Subtask ${subIndex + 1} type`}
            >
              <option value="TASK">Task</option>
              <option value="NOTE">Note</option>
            </select>
            <button
              type="button"
              onClick={() => removeSubtask(subIndex)}
              className="min-h-11 px-2 text-xs text-muted-light hover:text-accent-red"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="text-xs font-medium text-muted-light hover:text-accent-red"
      >
        Delete item
      </button>
    </article>
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
      <label
        htmlFor={fieldId}
        className="text-xs font-medium uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
