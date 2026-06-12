"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import type { PlanItemView } from "@/app/generated/prisma/client";

import {
  moveItemUnderTaskAction,
  promoteSubtaskToRootAction,
  reorderPlanItemsAction,
} from "@/app/(app)/plans/actions";
import { PlanItemCard } from "@/components/plans/plan-item-card";
import { PlanItemDragPreview } from "@/components/plans/plan-item-drag-preview";
import { ActionErrorBanner } from "@/components/ui/action-error-banner";
import {
  getMutationError,
  invokeServerAction,
} from "@/lib/invoke-server-action";
import {
  canNestTaskUnder,
  isDragNestingEnabled,
  isDragPromotionEnabled,
  isNestingDragOffset,
  isPromotionDragOffset,
} from "@/lib/plan-drag-nesting";
import type { PlanItemSectionGroup } from "@/lib/plan-item-sections";
import { useMediaQuery } from "@/lib/use-media-query";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type SortablePlanItemListProps = {
  planId: string;
  items: SerializedPlanItem[];
  sectionGroup: PlanItemSectionGroup;
  parentItemId?: string | null;
  itemDepth?: number;
  itemView?: PlanItemView;
  canEdit?: boolean;
  rootTasksForNesting?: SerializedPlanItem[];
  sourcePlanDate?: string;
};

type DragState = {
  activeId: string | null;
  overId: string | null;
  dragOffsetX: number;
  isNestingIntent: boolean;
  isPromotionIntent: boolean;
};

const INITIAL_DRAG_STATE: DragState = {
  activeId: null,
  overId: null,
  dragOffsetX: 0,
  isNestingIntent: false,
  isPromotionIntent: false,
};

function StaticPlanItemList({
  planId,
  items,
  itemView,
  canEdit,
  itemDepth,
}: {
  planId: string;
  items: SerializedPlanItem[];
  itemView: PlanItemView;
  canEdit: boolean;
  itemDepth: number;
}) {
  return (
    <>
      {items.map((item, index) => (
        <PlanItemCard
          key={item.id}
          planId={planId}
          item={item}
          depth={itemDepth}
          itemView={itemView}
          canEdit={canEdit}
          canMoveUp={canEdit && index > 0}
          canMoveDown={canEdit && index < items.length - 1}
        />
      ))}
    </>
  );
}

function renderSubtasksList(
  planId: string,
  item: SerializedPlanItem,
  itemView: PlanItemView,
  itemDepth: number,
  canEdit: boolean,
) {
  if (item.subtasks.length === 0) {
    return null;
  }

  return (
    <div className="mt-1.5">
      <SortablePlanItemList
        planId={planId}
        items={item.subtasks}
        sectionGroup="tasks"
        parentItemId={item.id}
        itemDepth={itemDepth + 1}
        itemView={itemView}
        canEdit={canEdit}
      />
    </div>
  );
}

function SortablePlanItemRow({
  planId,
  item,
  itemView,
  itemDepth,
  canEdit,
  canMoveUp,
  canMoveDown,
  rootTasksForNesting,
  isNestDropTarget,
  showNestDropHint,
  showPromoteDropHint,
  showNestedSubtasks,
  sourcePlanDate,
}: {
  planId: string;
  item: SerializedPlanItem;
  itemView: PlanItemView;
  itemDepth: number;
  canEdit: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  rootTasksForNesting?: SerializedPlanItem[];
  isNestDropTarget?: boolean;
  showNestDropHint?: boolean;
  showPromoteDropHint?: boolean;
  showNestedSubtasks?: boolean;
  sourcePlanDate?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "relative z-0" : undefined}>
      <PlanItemCard
        planId={planId}
        item={item}
        depth={itemDepth}
        isDragPlaceholder={isDragging}
        dragHandleRef={setActivatorNodeRef}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        itemView={itemView}
        canEdit={canEdit}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        rootTasksForNesting={rootTasksForNesting}
        isNestDropTarget={isNestDropTarget}
        showNestDropHint={showNestDropHint}
        showPromoteDropHint={showPromoteDropHint}
        sourcePlanDate={sourcePlanDate}
        subtasksContent={
          showNestedSubtasks
            ? renderSubtasksList(planId, item, itemView, itemDepth, canEdit)
            : undefined
        }
      />
    </div>
  );
}

function SortablePlanItemRows({
  planId,
  items,
  itemView,
  itemDepth,
  canEdit,
  sectionGroup,
  parentItemId,
  rootTasksForNesting,
  desktopDragEnabled,
  onDragStart,
  onDragMove,
  onDragOver,
  onDragEnd,
  onDragCancel,
  dragState,
  activeDragItem,
  dragPreviewWidth,
  sourcePlanDate,
}: {
  planId: string;
  items: SerializedPlanItem[];
  itemView: PlanItemView;
  itemDepth: number;
  canEdit: boolean;
  sectionGroup: PlanItemSectionGroup;
  parentItemId: string | null;
  rootTasksForNesting?: SerializedPlanItem[];
  desktopDragEnabled: boolean;
  onDragStart: (event: DragStartEvent) => void;
  onDragMove: (event: DragMoveEvent) => void;
  onDragOver: (overId: string | null) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: (event: DragCancelEvent) => void;
  dragState: DragState;
  activeDragItem: SerializedPlanItem | null;
  dragPreviewWidth?: number;
  sourcePlanDate?: string;
}) {
  const dndId = useId();
  const dragNestingEnabled = isDragNestingEnabled(
    canEdit,
    sectionGroup,
    parentItemId,
    desktopDragEnabled,
  );
  const dragPromotionEnabled = isDragPromotionEnabled(
    canEdit,
    sectionGroup,
    parentItemId,
    desktopDragEnabled,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={(event) => {
        onDragOver(event.over ? String(event.over.id) : null);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item, index) => (
          <SortablePlanItemRow
            key={item.id}
            planId={planId}
            item={item}
            itemView={itemView}
            itemDepth={itemDepth}
            canEdit={canEdit}
            canMoveUp={canEdit && index > 0}
            canMoveDown={canEdit && index < items.length - 1}
            rootTasksForNesting={rootTasksForNesting}
            isNestDropTarget={
              dragNestingEnabled &&
              dragState.isNestingIntent &&
              dragState.overId === item.id
            }
            showNestDropHint={
              dragNestingEnabled &&
              dragState.isNestingIntent &&
              dragState.overId === item.id
            }
            showPromoteDropHint={
              dragPromotionEnabled &&
              dragState.isPromotionIntent &&
              dragState.activeId === item.id
            }
            showNestedSubtasks={parentItemId === null}
            sourcePlanDate={sourcePlanDate}
          />
        ))}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <PlanItemDragPreview
            item={activeDragItem}
            itemView={itemView}
            width={dragPreviewWidth}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function SortablePlanItemList({
  planId,
  items: initialItems,
  sectionGroup,
  parentItemId = null,
  itemDepth = 0,
  itemView = "MINIMAL",
  canEdit = true,
  rootTasksForNesting,
  sourcePlanDate,
}: SortablePlanItemListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const [activeDragItem, setActiveDragItem] = useState<SerializedPlanItem | null>(
    null,
  );
  const [dragPreviewWidth, setDragPreviewWidth] = useState<number | undefined>();
  const dragOffsetXRef = useRef(0);
  const desktopDragEnabled = useMediaQuery("(min-width: 768px)");
  const dragNestingEnabled = isDragNestingEnabled(
    canEdit,
    sectionGroup,
    parentItemId,
    desktopDragEnabled,
  );
  const dragPromotionEnabled = isDragPromotionEnabled(
    canEdit,
    sectionGroup,
    parentItemId,
    desktopDragEnabled,
  );
  const nestingRoots = rootTasksForNesting ?? (parentItemId ? undefined : items);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function computeDragIntents(
    activeId: string | null,
    overId: string | null,
    dragOffsetX: number,
  ) {
    const isNestingIntent =
      dragNestingEnabled &&
      activeId !== null &&
      overId !== null &&
      isNestingDragOffset(dragOffsetX) &&
      canNestTaskUnder(activeId, overId, nestingRoots ?? []);

    const isPromotionIntent =
      dragPromotionEnabled &&
      activeId !== null &&
      isPromotionDragOffset(dragOffsetX);

    return { isNestingIntent, isPromotionIntent };
  }

  function resetDragState() {
    dragOffsetXRef.current = 0;
    setDragState(INITIAL_DRAG_STATE);
    setActiveDragItem(null);
    setDragPreviewWidth(undefined);
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    dragOffsetXRef.current = 0;
    setActiveDragItem(items.find((item) => item.id === activeId) ?? null);
    setDragPreviewWidth(event.active.rect.current.initial?.width ?? undefined);
    setDragState({
      activeId,
      overId: null,
      dragOffsetX: 0,
      isNestingIntent: false,
      isPromotionIntent: false,
    });
  }

  function handleDragMove(event: DragMoveEvent) {
    dragOffsetXRef.current += event.delta.x;

    setDragState((current) => {
      const dragOffsetX = dragOffsetXRef.current;
      const { isNestingIntent, isPromotionIntent } = computeDragIntents(
        current.activeId,
        current.overId,
        dragOffsetX,
      );

      return {
        ...current,
        dragOffsetX,
        isNestingIntent,
        isPromotionIntent,
      };
    });
  }

  function handleDragOver(overId: string | null) {
    setDragState((current) => {
      const { isNestingIntent, isPromotionIntent } = computeDragIntents(
        current.activeId,
        overId,
        current.dragOffsetX,
      );

      return {
        ...current,
        overId,
        isNestingIntent,
        isPromotionIntent,
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;
    const dragOffsetX = dragOffsetXRef.current;

    const promotionIntent =
      dragPromotionEnabled && isPromotionDragOffset(dragOffsetX);

    const nestingIntent =
      dragNestingEnabled &&
      overId !== null &&
      activeId !== overId &&
      isNestingDragOffset(dragOffsetX) &&
      canNestTaskUnder(activeId, overId, nestingRoots ?? []);

    resetDragState();

    if (promotionIntent) {
      const previousItems = items;
      setItems((current) => current.filter((item) => item.id !== activeId));
      setError(null);

      startTransition(async () => {
        const invoked = await invokeServerAction(() =>
          promoteSubtaskToRootAction(planId, activeId),
        );
        const mutationError = getMutationError(invoked);
        if (mutationError) {
          setError(mutationError.message);
          setItems(previousItems);
          router.refresh();
          return;
        }

        router.refresh();
      });
      return;
    }

    if (!over || active.id === over.id) {
      return;
    }

    if (nestingIntent && overId) {
      const previousItems = items;
      setItems((current) => current.filter((item) => item.id !== activeId));
      setError(null);

      startTransition(async () => {
        const invoked = await invokeServerAction(() =>
          moveItemUnderTaskAction(planId, activeId, overId),
        );
        const mutationError = getMutationError(invoked);
        if (mutationError) {
          setError(mutationError.message);
          setItems(previousItems);
          router.refresh();
          return;
        }

        router.refresh();
      });
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousItems = items;
    const nextItems = arrayMove(items, oldIndex, newIndex);
    setItems(nextItems);
    setError(null);

    startTransition(async () => {
      const invoked = await invokeServerAction(() =>
        reorderPlanItemsAction({
          planId,
          orderedItemIds: nextItems.map((item) => item.id),
          parentItemId,
          sectionGroup,
        }),
      );
      const mutationError = getMutationError(invoked);
      if (mutationError) {
        setError(mutationError.message);
        setItems(previousItems);
        router.refresh();
        return;
      }

      router.refresh();
    });
  }

  function handleDragCancel() {
    resetDragState();
  }

  return (
    <div className="space-y-2">
      {mounted && canEdit ? (
        <SortablePlanItemRows
          planId={planId}
          items={items}
          itemView={itemView}
          itemDepth={itemDepth}
          canEdit={canEdit}
          sectionGroup={sectionGroup}
          parentItemId={parentItemId}
          rootTasksForNesting={nestingRoots}
          desktopDragEnabled={desktopDragEnabled}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          dragState={dragState}
          activeDragItem={activeDragItem}
          dragPreviewWidth={dragPreviewWidth}
          sourcePlanDate={sourcePlanDate}
        />
      ) : (
        <StaticPlanItemList
          planId={planId}
          items={items}
          itemView={itemView}
          canEdit={canEdit}
          itemDepth={itemDepth}
        />
      )}

      {error ? <ActionErrorBanner message={error} /> : null}

      {isPending ? (
        <p className="sr-only" aria-live="polite">
          Saving item order…
        </p>
      ) : null}
    </div>
  );
}
