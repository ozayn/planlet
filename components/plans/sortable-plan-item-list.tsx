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
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type SortablePlanItemListProps = {
  planId: string;
  items: SerializedPlanItem[];
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
      {items.map((item) => (
        <PlanItemCard
          key={item.id}
          planId={planId}
          item={item}
          itemView={itemView}
          canEdit={canEdit}
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
}: {
  planId: string;
  item: SerializedPlanItem;
  itemView: PlanItemView;
  canEdit: boolean;
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
        {items.map((item) => (
          <SortablePlanItemRow
            key={item.id}
            planId={planId}
            item={item}
            itemView={itemView}
            canEdit={canEdit}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export function SortablePlanItemList({
  planId,
  items: initialItems,
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

    const nextItems = arrayMove(items, oldIndex, newIndex);
    setItems(nextItems);
    setError(null);

    startTransition(async () => {
      const result = await reorderPlanItemsAction(
        planId,
        nextItems.map((item) => item.id),
      );

      if (!result.success) {
        setError(result.error ?? "Failed to reorder items.");
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

      {error ? (
        <p className="text-xs text-accent-red" role="alert">
          {error}
        </p>
      ) : null}

      {isPending ? (
        <p className="sr-only" aria-live="polite">
          Saving item order…
        </p>
      ) : null}
    </div>
  );
}
