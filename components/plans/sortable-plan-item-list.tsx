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
import { useEffect, useState, useTransition } from "react";

import { reorderPlanItemsAction } from "@/app/(app)/plans/actions";
import { PlanItemCard } from "@/components/plans/plan-item-card";
import type { SerializedPlanItem } from "@/lib/plan-serialize";

type SortablePlanItemListProps = {
  planId: string;
  items: SerializedPlanItem[];
};

function SortablePlanItemRow({
  planId,
  item,
}: {
  planId: string;
  item: SerializedPlanItem;
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
      />
    </div>
  );
}

export function SortablePlanItemList({
  planId,
  items: initialItems,
}: SortablePlanItemListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortablePlanItemRow key={item.id} planId={planId} item={item} />
          ))}
        </SortableContext>
      </DndContext>

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
