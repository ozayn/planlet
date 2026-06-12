"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { PlanItemView } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { AddItemForm } from "@/components/plans/add-item-form";
import {
  AddSubtaskIcon,
  EditItemIcon,
  StickyNoteIcon,
} from "@/components/plans/item-action-icons";
import { useMediaQuery } from "@/lib/use-media-query";
import { getItemActionLabels } from "@/components/plans/item-action-labels";
import { ItemCommentsButton } from "@/components/plans/item-comments-button";
import { ItemActionsMenu } from "@/components/plans/item-actions-menu";
import { ItemDetailsSheet } from "@/components/plans/item-details-sheet";
import { InlineItemTitle } from "@/components/plans/inline-item-title";
import { StatusButton } from "@/components/plans/status-button";
import { GripVerticalIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS } from "@/lib/action-labels";
import {
  getPlanItemTypeLabel,
  getTimeHintLabel,
} from "@/lib/plan-labels";
import { getNestableParentCandidates } from "@/lib/plan-drag-nesting";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import { STATUS_STYLES } from "@/lib/plan-status";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type PlanItemCardProps = {
  planId: string;
  item: SerializedPlanItem;
  depth?: number;
  isDragPlaceholder?: boolean;
  dragHandleRef?: (element: HTMLElement | null) => void;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: DraggableSyntheticListeners;
  itemView?: PlanItemView;
  canEdit?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  rootTasksForNesting?: SerializedPlanItem[];
  isNestDropTarget?: boolean;
  showNestDropHint?: boolean;
  showPromoteDropHint?: boolean;
  subtasksContent?: React.ReactNode;
  sourcePlanDate?: string;
};

export function PlanItemCard({
  planId,
  item,
  depth = 0,
  isDragPlaceholder = false,
  dragHandleRef,
  dragHandleAttributes,
  dragHandleListeners,
  itemView = "MINIMAL",
  canEdit = true,
  canMoveUp = false,
  canMoveDown = false,
  rootTasksForNesting,
  isNestDropTarget = false,
  showNestDropHint = false,
  showPromoteDropHint = false,
  subtasksContent,
  sourcePlanDate,
}: PlanItemCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsFocusField, setDetailsFocusField] = useState<
    "comment" | null
  >(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const visibleActionsAreShown = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (!editingTitle) {
      setTitle(item.title);
    }
  }, [item.title, editingTitle]);

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) {
      setTitle(item.title);
      setEditingTitle(false);
      return;
    }

    startTransition(async () => {
      await updatePlanItemAction({
        planId,
        itemId: item.id,
        title: trimmed,
      });
      setEditingTitle(false);
      router.refresh();
    });
  }

  const subtaskCount = item.subtasks.length;
  const movableSubtaskCount = item.subtasks.filter(
    (subtask) => subtask.status === "OPEN" || subtask.status === "PARTIAL",
  ).length;
  const isNested = depth > 0;
  const actionLabels = getItemActionLabels(item.type, isNested);
  const timeHintLabel = getTimeHintLabel(item.timeHint);
  const typeLabel = getPlanItemTypeLabel(item.type);
  const hasNote = Boolean(item.comment?.trim());

  const desktopMetaParts = [
    item.type !== "TASK" ? typeLabel : null,
    timeHintLabel,
    subtaskCount > 0
      ? `${subtaskCount} subtask${subtaskCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  const mobileMetaParts: string[] = [];

  if (item.type !== "TASK") {
    mobileMetaParts.push(typeLabel);
  }

  if (timeHintLabel) {
    mobileMetaParts.push(timeHintLabel);
  }

  if (item.importance === "HIGH" || item.urgency === "HIGH") {
    mobileMetaParts.push("High priority");
  }

  if (subtaskCount > 0) {
    mobileMetaParts.push(
      `${subtaskCount} subtask${subtaskCount === 1 ? "" : "s"}`,
    );
  }
  if (hasNote && canEdit) {
    mobileMetaParts.push("1 note");
  }
  if (item.commentCount > 0) {
    mobileMetaParts.push(
      `${item.commentCount} comment${item.commentCount === 1 ? "" : "s"}`,
    );
  }

  const mobileSubmetaLine = mobileMetaParts.join(" · ");

  const showDragHandle = Boolean(dragHandleAttributes && dragHandleListeners);
  const nestableParentTasks = rootTasksForNesting
    ? getNestableParentCandidates(item.id, rootTasksForNesting).map(
        (candidate) => ({
          id: candidate.id,
          title: candidate.title,
        }),
      )
    : undefined;

  return (
    <article className={isNested ? "ms-3 border-s border-border-soft ps-2" : ""}>
      <div
        className={`ui-plan-item group relative overflow-visible px-3 py-2.5 sm:px-4 sm:py-2.5 ${STATUS_STYLES[item.status].card} ${
          isDragPlaceholder ? "pointer-events-none" : "transition-shadow"
        } ${isNestDropTarget ? "ring-2 ring-accent-cream/90" : ""}`}
      >
        <span
          className={`absolute inset-y-2 start-0 w-0.5 rounded-full opacity-50 transition-opacity group-hover:opacity-80 group-focus-within:opacity-90 ${STATUS_STYLES[item.status].accentBar}`}
          aria-hidden="true"
        />
        <div className="ui-plan-item-stack flex flex-col gap-0 md:gap-0.5">
          <div className="ui-plan-item-row flex items-start gap-1.5 ps-0.5 sm:items-center sm:gap-2.5 sm:ps-1.5">
            {showDragHandle ? (
              <button
                type="button"
                ref={dragHandleRef}
                {...passwordManagerSafeControlProps}
                className={`ui-plan-item-drag hidden h-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-light transition-colors hover:text-muted active:cursor-grabbing md:flex ${isNested ? "w-4" : "w-5"}`}
                aria-label="Drag to reorder item"
                {...dragHandleAttributes}
                {...dragHandleListeners}
              >
                <GripVerticalIcon className="h-4 w-3" />
              </button>
            ) : isNested ? (
              <span
                className="ui-plan-item-drag hidden h-8 w-0 shrink-0 md:block"
                aria-hidden="true"
              />
            ) : null}

            <div className="ui-plan-item-status shrink-0">
              <StatusButton
                planId={planId}
                itemId={item.id}
                status={item.status}
                compact
                itemView={itemView}
                mobileIconOnly
              />
            </div>

            <div className="ui-plan-item-content min-w-0 flex-1">
              <InlineItemTitle
                id={`item-title-${item.id}`}
                name={`itemTitle-${item.id}`}
                value={title}
                displayValue={item.title}
                editing={editingTitle}
                canEdit={canEdit}
                pending={isPending}
                ariaLabel="Item title"
                onStartEdit={() => setEditingTitle(true)}
                onChange={setTitle}
                onSave={saveTitle}
                onCancel={() => {
                  setTitle(item.title);
                  setEditingTitle(false);
                }}
              />

              {desktopMetaParts.length > 0 ? (
                <p className="ui-plan-item-meta mt-0.5 hidden truncate text-[0.6875rem] leading-tight text-muted-light md:block">
                  {desktopMetaParts.join(" · ")}
                </p>
              ) : null}
              {showNestDropHint ? (
                <p className="mt-0.5 hidden text-[0.6875rem] font-medium text-muted md:block">
                  Drop as subtask
                </p>
              ) : null}
              {showPromoteDropHint ? (
                <p className="mt-0.5 hidden text-[0.6875rem] font-medium text-muted md:block">
                  Drop as task
                </p>
              ) : null}
            </div>

            <div className="ui-item-card-actions ui-plan-item-actions flex shrink-0 items-center gap-0.5">
              {canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsFocusField(null);
                      setDetailsOpen(true);
                    }}
                    {...passwordManagerSafeControlProps}
                    className="ui-plan-item-desktop-action hidden md:inline-flex ui-icon-action-quiet"
                    aria-label={actionLabels.edit}
                    title={actionLabels.edit}
                  >
                    <EditItemIcon className="h-4 w-4" />
                    <span className="ui-tooltip-bubble" role="tooltip">
                      {actionLabels.edit}
                    </span>
                  </button>
                  {!isNested ? (
                    <button
                      type="button"
                      onClick={() => setShowSubtaskForm((current) => !current)}
                      {...passwordManagerSafeControlProps}
                      className={`ui-plan-item-desktop-action hidden md:inline-flex ui-icon-action-quiet${
                        showSubtaskForm ? " ui-icon-action-quiet-active" : ""
                      }`}
                      aria-label={
                        showSubtaskForm ? "Cancel subtask" : "Add subtask"
                      }
                      title={showSubtaskForm ? "Cancel subtask" : "Add subtask"}
                    >
                      <AddSubtaskIcon className="h-4 w-4" />
                      <span className="ui-tooltip-bubble" role="tooltip">
                        {showSubtaskForm ? "Cancel subtask" : "Add subtask"}
                      </span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsFocusField("comment");
                      setDetailsOpen(true);
                    }}
                    {...passwordManagerSafeControlProps}
                    className="ui-plan-item-desktop-action hidden md:inline-flex ui-icon-action-quiet"
                    aria-label={ACTION_LABELS.taskNote.ariaLabel}
                    title={ACTION_LABELS.taskNote.title}
                  >
                    <StickyNoteIcon className="h-4 w-4" />
                    <span className="ui-tooltip-bubble" role="tooltip">
                      {ACTION_LABELS.taskNote.title}
                    </span>
                  </button>
                </>
              ) : null}
              <ItemCommentsButton
                itemId={item.id}
                itemTitle={item.title}
                commentCount={item.commentCount}
                buttonClassName="ui-plan-item-desktop-action hidden md:inline-flex"
                open={commentsOpen}
                onOpenChange={setCommentsOpen}
              />
              <ItemActionsMenu
                planId={planId}
                itemId={item.id}
                itemTitle={item.title}
                itemType={item.type}
                isSubtask={isNested}
                canEdit={canEdit}
                visibleActionsAreShown={visibleActionsAreShown}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                nestableParentTasks={nestableParentTasks}
                sourcePlanDate={sourcePlanDate}
                hasSubtasks={!isNested && subtaskCount > 0}
                movableSubtaskCount={!isNested ? movableSubtaskCount : 0}
                commentCount={item.commentCount}
                onEdit={() => setDetailsOpen(true)}
                onAddSubtask={
                  !isNested
                    ? () => setShowSubtaskForm((current) => !current)
                    : undefined
                }
                onTaskNote={canEdit ? () => setDetailsOpen(true) : undefined}
                onComments={() => setCommentsOpen(true)}
              />
            </div>
          </div>

          {mobileSubmetaLine ? (
            <p className="ui-plan-item-submeta ps-12 text-[0.6875rem] leading-tight text-muted-light md:hidden">
              {mobileSubmetaLine}
            </p>
          ) : null}
        </div>
      </div>

      {showSubtaskForm ? (
        <div className="mt-1.5 ms-11 border-s border-border-soft/70 ps-2.5 md:ms-9 md:ps-3">
          <AddItemForm
            planId={planId}
            parentItemId={item.id}
            placeholder="Subtask"
            buttonLabel="Add subtask"
            compact
          />
        </div>
      ) : null}

      {!isDragPlaceholder &&
        (subtasksContent ??
          (item.subtasks.length > 0 ? (
          <div className="mt-1.5 space-y-1.5">
            {item.subtasks.map((subtask, subtaskIndex) => (
              <PlanItemCard
                key={subtask.id}
                planId={planId}
                item={subtask}
                depth={depth + 1}
                itemView={itemView}
                canEdit={canEdit}
                canMoveUp={canEdit && subtaskIndex > 0}
                canMoveDown={
                  canEdit && subtaskIndex < item.subtasks.length - 1
                }
              />
            ))}
          </div>
        ) : null))}

      {canEdit ? (
        <ItemDetailsSheet
          planId={planId}
          item={item}
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setDetailsFocusField(null);
          }}
          focusField={detailsFocusField}
          isSubtask={isNested}
        />
      ) : null}
    </article>
  );
}
