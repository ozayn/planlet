"use client";

import type { TaskOrganizationDisplay } from "@/app/generated/prisma/client";

import {
  ItemThemeProjectLabel,
  ItemThemeProjectPicker,
} from "@/components/plans/item-theme-project-picker";
import type { SerializedPlanItem } from "@/lib/plan-serialize";
import {
  hasThemeProjectAssignment,
  type ThemeProjectCatalog,
} from "@/lib/theme-project-types";

type ItemThemeProjectRowControlProps = {
  planId: string;
  item: SerializedPlanItem;
  catalog: ThemeProjectCatalog;
  canEdit: boolean;
  displayMode: TaskOrganizationDisplay;
};

export function ItemThemeProjectRowControl({
  planId,
  item,
  catalog,
  canEdit,
  displayMode,
}: ItemThemeProjectRowControlProps) {
  const assigned = hasThemeProjectAssignment(item);

  if (!canEdit) {
    return assigned ? <ItemThemeProjectLabel item={item} /> : null;
  }

  if (displayMode === "MINIMAL") {
    return null;
  }

  if (displayMode === "ALWAYS") {
    return (
      <ItemThemeProjectPicker
        planId={planId}
        item={item}
        catalog={catalog}
        canEdit
        compact
        emptyOptionLabel="+ Theme"
      />
    );
  }

  if (!assigned) {
    return null;
  }

  return (
    <>
      <span className="md:hidden">
        <ItemThemeProjectLabel item={item} />
      </span>
      <span className="relative hidden max-w-[9rem] md:inline-flex md:items-center">
        <span className="transition-opacity group-hover:opacity-0">
          <ItemThemeProjectLabel item={item} />
        </span>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-end opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <ItemThemeProjectPicker
            planId={planId}
            item={item}
            catalog={catalog}
            canEdit
            compact
            emptyOptionLabel="+ Theme"
          />
        </span>
      </span>
    </>
  );
}
