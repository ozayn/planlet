"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { PlanItemView } from "@/app/generated/prisma/client";
import {
  addUnfinishedTaskReflectionAction,
  deleteUnfinishedTaskAction,
  markUnfinishedTaskDoneAction,
  moveUnfinishedTaskToDateAction,
} from "@/app/(app)/unfinished/actions";
import { UnfinishedTaskRow } from "@/components/unfinished/unfinished-task-row";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import { shiftDateString } from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import {
  UNFINISHED_TASK_RANGE_OPTIONS,
  UNFINISHED_TASK_REFLECTION_REASONS,
  UNFINISHED_TASK_STATUS_FILTERS,
  type SerializedUnfinishedTask,
  type UnfinishedTasksPageData,
} from "@/lib/unfinished-tasks/constants";

type UnfinishedTasksPageProps = {
  data: UnfinishedTasksPageData;
  itemView?: PlanItemView;
  canDelete?: boolean;
};

type MoveSheetState = {
  task: SerializedUnfinishedTask;
  targetDate: string;
  error: string | null;
  success: string | null;
};

type ReflectionSheetState = {
  task: SerializedUnfinishedTask;
  reason: string;
  note: string;
  error: string | null;
};

function deleteConfirmTitle(task: SerializedUnfinishedTask): string {
  if (!task.isSubtask && task.subtaskCount > 0) {
    return "Delete this task and its subtasks?";
  }

  return "Delete this task?";
}

function todayString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function assignmentFilterValue(task: SerializedUnfinishedTask): string {
  if (task.projectId) {
    return `project:${task.projectId}`;
  }

  if (task.themeId) {
    return `theme:${task.themeId}`;
  }

  return "all";
}

export function UnfinishedTasksPage({
  data,
  itemView = "CHECKLIST",
  canDelete = true,
}: UnfinishedTasksPageProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [markingDoneId, setMarkingDoneId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedUnfinishedTask | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [moveSheet, setMoveSheet] = useState<MoveSheetState | null>(null);
  const [reflectionSheet, setReflectionSheet] =
    useState<ReflectionSheetState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredTasks = useMemo(
    () =>
      data.tasks.filter((task) => {
        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }

        if (
          assignmentFilter !== "all" &&
          assignmentFilterValue(task) !== assignmentFilter
        ) {
          return false;
        }

        return true;
      }),
    [assignmentFilter, data.tasks, statusFilter],
  );

  function handleMarkDone(task: SerializedUnfinishedTask) {
    setPageError(null);
    setMarkingDoneId(task.id);
    startTransition(async () => {
      const result = await markUnfinishedTaskDoneAction({ itemId: task.id });
      if (!result.success) {
        setMarkingDoneId(null);
        setPageError(result.error);
        return;
      }
      setMarkingDoneId(null);
      router.refresh();
    });
  }

  function handleMove() {
    if (!moveSheet) return;

    const { task, targetDate } = moveSheet;
    setMoveSheet({ ...moveSheet, error: null, success: null });

    startTransition(async () => {
      const result = await moveUnfinishedTaskToDateAction({
        itemId: task.id,
        targetDate,
      });

      if (!result.success) {
        setMoveSheet((current) =>
          current ? { ...current, error: result.error, success: null } : current,
        );
        return;
      }

      setMoveSheet((current) =>
        current
          ? {
              ...current,
              error: null,
              success: `Moved to ${result.targetDateLabel}.`,
            }
          : current,
      );
      router.refresh();
    });
  }

  function handleSaveReflection() {
    if (!reflectionSheet) return;

    setReflectionSheet({ ...reflectionSheet, error: null });
    startTransition(async () => {
      const result = await addUnfinishedTaskReflectionAction({
        itemId: reflectionSheet.task.id,
        reason: reflectionSheet.reason || null,
        note: reflectionSheet.note || null,
      });

      if (!result.success) {
        setReflectionSheet((current) =>
          current ? { ...current, error: result.error } : current,
        );
        return;
      }

      setReflectionSheet(null);
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteUnfinishedTaskAction({
        planId: deleteTarget.planId,
        itemId: deleteTarget.id,
      });

      if (!result.success) {
        setDeleteError(result.error);
        return;
      }

      setDeleteTarget(null);
      router.refresh();
    });
  }

  const defaultMoveDate = shiftDateString(todayString(), 1);
  const rowDisabled = isPending || isDeleting;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {UNFINISHED_TASK_RANGE_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={`/unfinished?range=${option.value}`}
            className={`min-h-9 rounded-lg px-3 py-2 text-sm transition-colors ${
              data.range === option.value ? "ui-segment-active" : "ui-segment"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-border-soft bg-surface p-4">
        <div className="flex flex-wrap gap-1.5">
          {UNFINISHED_TASK_STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`min-h-9 rounded-lg px-3 text-sm transition-colors ${
                statusFilter === option.value ? "ui-segment-active" : "ui-segment"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {data.assignmentFilters.length > 0 ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Theme / project</span>
            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value)}
              className="ui-input min-h-10 w-full text-sm"
            >
              <option value="all">All themes and projects</option>
              {data.assignmentFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {pageError ? (
        <p className="text-sm text-accent-red" role="alert">
          {pageError}
        </p>
      ) : null}

      {data.truncated && data.limit ? (
        <p className="text-sm text-muted">
          Showing the most recent {data.limit} unfinished tasks.
        </p>
      ) : null}

      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-soft px-4 py-8 text-center">
          <p className="text-sm text-muted">No unfinished tasks in this range.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filteredTasks.map((task) => (
            <li key={task.id}>
              <UnfinishedTaskRow
                task={task}
                itemView={itemView}
                disabled={rowDisabled}
                markingDone={markingDoneId === task.id}
                canDelete={canDelete}
                onMarkDone={handleMarkDone}
                onMove={(selectedTask) =>
                  setMoveSheet({
                    task: selectedTask,
                    targetDate: defaultMoveDate,
                    error: null,
                    success: null,
                  })
                }
                onReflect={(selectedTask) =>
                  setReflectionSheet({
                    task: selectedTask,
                    reason: "",
                    note: "",
                    error: null,
                  })
                }
                onDelete={
                  canDelete
                    ? (selectedTask) => {
                        setDeleteError(null);
                        setDeleteTarget(selectedTask);
                      }
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? deleteConfirmTitle(deleteTarget) : "Delete this task?"}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        isConfirming={isDeleting}
        confirmDanger
      >
        {deleteError ? (
          <p className="text-accent-red" role="alert">
            {deleteError}
          </p>
        ) : null}
      </ConfirmDialog>

      <SimpleSheet
        open={moveSheet !== null}
        onClose={() => {
          if (!isPending) setMoveSheet(null);
        }}
        title="Move task"
        footer={
          <button
            type="button"
            disabled={isPending || !moveSheet?.targetDate || Boolean(moveSheet?.success)}
            onClick={handleMove}
            className="ui-btn-primary w-full disabled:opacity-50"
          >
            {isPending ? "Moving…" : "Move forward"}
          </button>
        }
      >
        {moveSheet ? (
          <div className="space-y-4">
            <p className="text-sm text-muted" dir="auto">
              Move &ldquo;{moveSheet.task.title}&rdquo; to another daily plan.
            </p>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Date</span>
              <input
                type="date"
                value={moveSheet.targetDate}
                onChange={(event) =>
                  setMoveSheet({ ...moveSheet, targetDate: event.target.value })
                }
                disabled={isPending || Boolean(moveSheet.success)}
                className="ui-input min-h-11 w-full"
                {...passwordManagerSafeControlProps}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Today", value: todayString() },
                { label: "Tomorrow", value: shiftDateString(todayString(), 1) },
                { label: "Next week", value: shiftDateString(todayString(), 7) },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  disabled={isPending || Boolean(moveSheet.success)}
                  onClick={() =>
                    setMoveSheet({ ...moveSheet, targetDate: option.value })
                  }
                  className="ui-btn-secondary ui-btn-compact min-h-9 px-3 text-xs disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {moveSheet.success ? (
              <p className="text-sm text-foreground">{moveSheet.success}</p>
            ) : null}
            {moveSheet.error ? (
              <p className="text-sm text-accent-red" role="alert">
                {moveSheet.error}
              </p>
            ) : null}
          </div>
        ) : null}
      </SimpleSheet>

      <SimpleSheet
        open={reflectionSheet !== null}
        onClose={() => {
          if (!isPending) setReflectionSheet(null);
        }}
        title="Reflect"
        footer={
          <button
            type="button"
            disabled={
              isPending ||
              !reflectionSheet ||
              (!reflectionSheet.reason && !reflectionSheet.note.trim())
            }
            onClick={handleSaveReflection}
            className="ui-btn-primary w-full disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save reflection"}
          </button>
        }
      >
        {reflectionSheet ? (
          <div className="space-y-4">
            <p className="text-sm text-muted" dir="auto">
              Why is &ldquo;{reflectionSheet.task.title}&rdquo; still open?
            </p>
            <div className="flex flex-wrap gap-2">
              {UNFINISHED_TASK_REFLECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setReflectionSheet({
                      ...reflectionSheet,
                      reason:
                        reflectionSheet.reason === reason ? "" : reason,
                    })
                  }
                  className={`min-h-9 rounded-full border px-3 text-xs transition-colors disabled:opacity-50 ${
                    reflectionSheet.reason === reason
                      ? "border-border bg-accent-cream/70 text-foreground"
                      : "border-border-soft text-muted hover:border-border hover:text-foreground"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Note</span>
              <textarea
                value={reflectionSheet.note}
                onChange={(event) =>
                  setReflectionSheet({
                    ...reflectionSheet,
                    note: event.target.value,
                  })
                }
                disabled={isPending}
                rows={4}
                placeholder="Optional context or next step"
                className="ui-textarea w-full resize-y"
                dir="auto"
                {...passwordManagerSafeControlProps}
              />
            </label>
            {reflectionSheet.error ? (
              <p className="text-sm text-accent-red" role="alert">
                {reflectionSheet.error}
              </p>
            ) : null}
          </div>
        ) : null}
      </SimpleSheet>
    </div>
  );
}
