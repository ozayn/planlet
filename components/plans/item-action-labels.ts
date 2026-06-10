import type { PlanItemType } from "@/app/generated/prisma/client";

export type ItemActionLabels = {
  edit: string;
  delete: string;
  more: string;
  sheetTitle: string;
  deleteTitle: string;
  deleteBody: string;
  deleteConfirm: string;
};

export function getItemActionLabels(
  type: PlanItemType,
  isSubtask = false,
): ItemActionLabels {
  if (isSubtask) {
    return {
      edit: "Edit subtask",
      delete: "Delete subtask",
      more: "More subtask actions",
      sheetTitle: "Edit subtask",
      deleteTitle: "Delete this item?",
      deleteBody:
        "This will delete the item and any subtasks. This cannot be undone.",
      deleteConfirm: "Delete item",
    };
  }

  if (type === "NOTE") {
    return {
      edit: "Edit note",
      delete: "Delete note",
      more: "More note actions",
      sheetTitle: "Edit note",
      deleteTitle: "Delete this item?",
      deleteBody:
        "This will delete the item and any subtasks. This cannot be undone.",
      deleteConfirm: "Delete item",
    };
  }

  if (type === "INTENTION") {
    return {
      edit: "Edit intention",
      delete: "Delete intention",
      more: "More intention actions",
      sheetTitle: "Edit intention",
      deleteTitle: "Delete this item?",
      deleteBody:
        "This will delete the item and any subtasks. This cannot be undone.",
      deleteConfirm: "Delete item",
    };
  }

  return {
    edit: "Edit item",
    delete: "Delete item",
    more: "More item actions",
    sheetTitle: "Edit item",
    deleteTitle: "Delete this item?",
    deleteBody:
      "This will delete the item and any subtasks. This cannot be undone.",
    deleteConfirm: "Delete item",
  };
}
