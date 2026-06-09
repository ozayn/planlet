"use client";

import type {
  ParsedPlan,
  ParsedPlanItem,
  ParsedSubtask,
} from "@/lib/ai/plan-parser-schema";
import { getPlanItemTypeLabel } from "@/lib/plan-labels";

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

const inputClass =
  "w-full min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20";

const selectClass =
  "min-h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20";

type ParsedPlanReviewProps = {
  draft: ParsedPlan;
  onChange: (draft: ParsedPlan) => void;
};

export function ParsedPlanReview({ draft, onChange }: ParsedPlanReviewProps) {
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

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <Field label="Plan title">
          <input
            type="text"
            dir="auto"
            value={draft.title}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan type">
            <select
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
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Language">
            <select
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
                  {language}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Summary">
          <textarea
            dir="auto"
            rows={2}
            value={draft.summary ?? ""}
            onChange={(event) =>
              onChange({ ...draft, summary: event.target.value })
            }
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-stone-800">Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="min-h-10 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 hover:border-stone-300"
          >
            Add item
          </button>
        </div>

        {draft.items.map((item, index) => (
          <ReviewItemCard
            key={index}
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
  item,
  onChange,
  onDelete,
}: {
  item: ParsedPlanItem;
  onChange: (item: ParsedPlanItem) => void;
  onDelete: () => void;
}) {
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
    <article className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <Field label="Title">
        <input
          type="text"
          dir="auto"
          value={item.title}
          onChange={(event) => onChange({ ...item, title: event.target.value })}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <select
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

        <Field label="Time hint">
          <select
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
                {hint}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Importance">
          <select
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
                {level}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Urgency">
          <select
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
                {level}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex min-h-10 items-center gap-3 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={item.shareable ?? true}
          onChange={(event) =>
            onChange({ ...item, shareable: event.target.checked })
          }
          className="h-5 w-5 rounded border-stone-300"
        />
        Shareable
      </label>

      <div className="space-y-2 border-t border-stone-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Subtasks
          </span>
          <button
            type="button"
            onClick={addSubtask}
            className="text-xs font-medium text-stone-600 hover:text-stone-900"
          >
            Add subtask
          </button>
        </div>
        {(item.subtasks ?? []).map((subtask, subIndex) => (
          <div key={subIndex} className="flex gap-2">
            <input
              type="text"
              dir="auto"
              value={subtask.title}
              onChange={(event) =>
                updateSubtask(subIndex, { ...subtask, title: event.target.value })
              }
              className={`${inputClass} flex-1`}
              placeholder="Subtask"
            />
            <select
              value={subtask.type ?? "TASK"}
              onChange={(event) =>
                updateSubtask(subIndex, {
                  ...subtask,
                  type: event.target.value as ParsedSubtask["type"],
                })
              }
              className={selectClass}
            >
              <option value="TASK">Task</option>
              <option value="NOTE">Note</option>
            </select>
            <button
              type="button"
              onClick={() => removeSubtask(subIndex)}
              className="min-h-11 px-2 text-xs text-stone-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="text-xs font-medium text-stone-400 hover:text-red-600"
      >
        Delete item
      </button>
    </article>
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
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </span>
      {children}
    </label>
  );
}
