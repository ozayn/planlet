"use client";

import type { PlanItemView } from "@/app/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { MoveToDateIcon } from "@/components/plans/item-action-icons";
import { PlanItemStatusVisual } from "@/components/plans/plan-item-status-visual";
import { APP_TIMEZONE } from "@/config/time";
import { parseDateString } from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import { getStatusLabel, STATUS_STYLES } from "@/lib/plan-status";
import type { SerializedUnfinishedTask } from "@/lib/unfinished-tasks/constants";

type UnfinishedTaskRowProps = {
  task: SerializedUnfinishedTask;
  itemView?: PlanItemView;
  disabled?: boolean;
  markingDone?: boolean;
  canDelete?: boolean;
  onMarkDone: (task: SerializedUnfinishedTask) => void;
  onMove: (task: SerializedUnfinishedTask) => void;
  onReflect: (task: SerializedUnfinishedTask) => void;
  onDelete?: (task: SerializedUnfinishedTask) => void;
};

function compactPlanDateLabel(planDate: string): string {
  return formatInTimeZone(parseDateString(planDate), APP_TIMEZONE, "MMM d");
}

function metadataLine(task: SerializedUnfinishedTask): string {
  return [
    compactPlanDateLabel(task.planDate),
    getStatusLabel(task.status),
    task.assignmentLabel,
    task.parentTitle ? `Subtask of ${task.parentTitle}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function RowActions({
  task,
  disabled,
  canDelete = true,
  onMove,
  onReflect,
  onDelete,
  className,
}: {
  task: SerializedUnfinishedTask;
  disabled: boolean;
  canDelete?: boolean;
  onMove: (task: SerializedUnfinishedTask) => void;
  onReflect: (task: SerializedUnfinishedTask) => void;
  onDelete?: (task: SerializedUnfinishedTask) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled || task.isSubtask}
        onClick={() => onMove(task)}
        className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/60 hover:text-foreground disabled:opacity-50"
        title={task.isSubtask ? "Move the parent task from its plan." : "Move to date"}
      >
        <MoveToDateIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Move</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onReflect(task)}
        className="inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/60 hover:text-foreground disabled:opacity-50"
      >
        Reflect
      </button>
      {canDelete && onDelete ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete(task)}
          className="inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-muted transition-colors hover:bg-accent-cream/60 hover:text-foreground disabled:opacity-50"
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}

export function UnfinishedTaskRow({
  task,
  itemView = "CHECKLIST",
  disabled = false,
  markingDone = false,
  canDelete = true,
  onMarkDone,
  onMove,
  onReflect,
  onDelete,
}: UnfinishedTaskRowProps) {
  const statusForDisplay = markingDone ? "DONE" : task.status;
  const statusLabel = markingDone ? getStatusLabel("DONE") : getStatusLabel(task.status);

  return (
    <article className={task.isSubtask ? "ms-3 border-s border-border-soft ps-2" : ""}>
      <div
        className={`ui-plan-item group relative overflow-visible px-3 py-2.5 sm:px-4 sm:py-2.5 ${STATUS_STYLES[statusForDisplay].card}`}
      >
        <span
          className={`absolute inset-y-2 start-0 w-0.5 rounded-full opacity-50 transition-opacity group-hover:opacity-80 group-focus-within:opacity-90 ${STATUS_STYLES[statusForDisplay].accentBar}`}
          aria-hidden="true"
        />

        <div className="ui-plan-item-stack flex flex-col gap-0 md:gap-0.5">
          <div className="ui-plan-item-row flex items-start gap-1.5 ps-0.5 sm:items-center sm:gap-2.5 sm:ps-1.5">
            <span
              className="ui-plan-item-drag hidden h-8 w-0 shrink-0 md:block"
              aria-hidden="true"
            />

            <div className="ui-plan-item-status shrink-0">
              <button
                type="button"
                disabled={disabled || markingDone}
                onClick={() => onMarkDone(task)}
                {...passwordManagerSafeControlProps}
                aria-label={`Mark done: ${task.title}`}
                title="Mark done"
                className={`ui-status-trigger ui-status-trigger-compact inline-flex items-center justify-center rounded-full border border-border-soft bg-surface/80 font-medium text-foreground transition-colors hover:border-border hover:bg-accent-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-subtle)] disabled:opacity-50 ${STATUS_STYLES[statusForDisplay].icon}`}
              >
                <span className="ui-status-trigger-icon flex h-4 w-4 shrink-0 items-center justify-center">
                  <PlanItemStatusVisual
                    status={statusForDisplay}
                    itemView={itemView}
                    className="h-3.5 w-3.5"
                  />
                </span>
              </button>
            </div>

            <div className="ui-plan-item-content min-w-0 flex-1">
              <p
                className="ui-plan-item-title text-sm font-medium leading-snug text-foreground sm:text-[0.9375rem]"
                dir="auto"
              >
                {task.title}
              </p>
              <p className="ui-plan-item-meta mt-0.5 truncate text-[0.6875rem] leading-tight text-muted-light">
                {metadataLine(task)}
              </p>
              {task.subtaskCount > 0 ? (
                <p className="ui-plan-item-meta mt-0.5 hidden truncate text-[0.6875rem] leading-tight text-muted-light md:block">
                  {task.movableSubtaskCount} unfinished subtask
                  {task.movableSubtaskCount === 1 ? "" : "s"} can move forward
                </p>
              ) : null}
            </div>

            <RowActions
              task={task}
              disabled={disabled}
              canDelete={canDelete}
              onMove={onMove}
              onReflect={onReflect}
              onDelete={onDelete}
              className="ui-plan-item-actions hidden shrink-0 items-center gap-0.5 md:flex"
            />
          </div>

          {task.subtaskCount > 0 ? (
            <p className="ui-plan-item-submeta ps-12 text-[0.6875rem] leading-tight text-muted-light md:hidden">
              {task.movableSubtaskCount} unfinished subtask
              {task.movableSubtaskCount === 1 ? "" : "s"} can move forward
            </p>
          ) : null}

          <RowActions
            task={task}
            disabled={disabled}
            canDelete={canDelete}
            onMove={onMove}
            onReflect={onReflect}
            onDelete={onDelete}
            className="flex flex-wrap gap-1 ps-12 md:hidden"
          />
        </div>

        {task.latestReflection ? (
          <div className="mt-2 ms-11 rounded-xl border border-border-soft/80 bg-accent-cream/25 px-3 py-2 text-sm text-muted md:ms-9">
            {task.latestReflection.reason ? (
              <p className="font-medium text-foreground">
                {task.latestReflection.reason}
              </p>
            ) : null}
            {task.latestReflection.note ? (
              <p className="mt-1 whitespace-pre-wrap" dir="auto">
                {task.latestReflection.note}
              </p>
            ) : null}
          </div>
        ) : null}

        {markingDone ? (
          <span className="sr-only">Marking {task.title} as {statusLabel}</span>
        ) : null}
      </div>
    </article>
  );
}
