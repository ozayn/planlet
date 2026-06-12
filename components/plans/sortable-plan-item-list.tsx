"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import { useEffect, useId, useState, useTransition } from "react";

import type { PlanItemView } from "@/app/generated/prisma/client";

import { reorderPlanItemsAction } from "@/app/(app)/plans/actions";
import { PlanItemCard } from "@/components/plans/plan-item-card";
import { ActionErrorBanner } from "@/components/ui/action-error-banner";
import {
  getMutationError,
  invokeServerAction,
} from "@/lib/invoke-server-action";
import type { PlanItemSectionGroup } from "@/lib/plan-item-sections";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type SortablePlanItemListProps = {
  planId: string;
  items: SerializedPlanItem[];
  sectionGroup: PlanItemSectionGroup;
  parentItemId?: string | null;
  itemView?: PlanItemView;
  canEdit?: boolean;
};

function StaticPlanItemList({
  planId,
  items,
  itemView,
  canEdit,
}: {
  planId: string;
  items: SerializedPlanItem[];
  itemView: PlanItemView;
  canEdit: boolean;
}) {
  return (
    <>
      {items.map((item, index) => (
        <PlanItemCard
          key={item.id}
          planId={planId}
          item={item}
          itemView={itemView}
          canEdit={canEdit}
          canMoveUp={canEdit && index > 0}
          canMoveDown={canEdit && index < items.length - 1}
        />
      ))}
    </>
  );
}

function SortablePlanItemRow({
  planId,
  item,
  itemView,
  canEdit,
  canMoveUp,
  canMoveDown,
}: {
  planId: string;
  item: SerializedPlanItem;
  itemView: PlanItemView;
  canEdit: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
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
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PlanItemCard
        planId={planId}
        item={item}
        isDragging={isDragging}
        dragHandleRef={setActivatorNodeRef}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        itemView={itemView}
        canEdit={canEdit}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />
    </div>
  );
}

function SortablePlanItemRows({
  planId,
  items,
  itemView,
  canEdit,
  onDragEnd,
}: {
  planId: string;
  items: SerializedPlanItem[];
  itemView: PlanItemView;
  canEdit: boolean;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const dndId = useId();

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
      onDragEnd={onDragEnd}
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
            canEdit={canEdit}
            canMoveUp={canEdit && index > 0}
            canMoveDown={canEdit && index < items.length - 1}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function SortablePlanItemList({
  planId,
  items: initialItems,
  sectionGroup,
  parentItemId = null,
  itemView = "MINIMAL",
  canEdit = true,
}: SortablePlanItemListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
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

  return (
    <div className="space-y-2">
      {mounted && canEdit ? (
        <SortablePlanItemRows
          planId={planId}
          items={items}
          itemView={itemView}
          canEdit={canEdit}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <StaticPlanItemList
          planId={planId}
          items={items}
          itemView={itemView}
          canEdit={canEdit}
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
