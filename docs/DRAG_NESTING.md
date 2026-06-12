# Drag-to-nest and drag-to-promote (desktop)

June 2026 — moving tasks between root list and subtasks via drag on md+ screens.

## Thresholds

| Action | Direction | Threshold |
|--------|-----------|-----------|
| Nest as subtask | Right | ≥ **36px** (`NESTING_THRESHOLD_PX`) |
| Promote to root | Left | ≤ **-36px** (`PROMOTION_THRESHOLD_PX`) |

Vertical-only drags reorder within the current list.

## Desktop — root task nesting

**Where:** Tasks section (`SortablePlanItemList`, `parentItemId: null`).

1. Drag a root task over another root task.
2. Move **≥36px right** → target highlights, hint: **Drop as subtask**.
3. Drop → item becomes **last subtask** under target; removed from root list.

## Desktop — subtask promotion

**Where:** Subtask list under a parent task (`SortablePlanItemList`, `parentItemId` set).

1. Drag a subtask **≥36px left**.
2. Hint on dragged item: **Drop as task**.
3. Drop → item moves to **last position** in root Tasks section (`promoteSubtaskToRoot`).

Subtasks without left threshold reorder vertically within the same parent.

## Eligibility

| Allowed | Not allowed |
|---------|-------------|
| Root tasks (`TASK_ITEM_TYPES`) | Intentions, notes |
| Subtasks (task types) | Shared/read-only viewers |
| Same plan, owner can edit | Cross-plan, invalid parent/descendant |

## Mobile

No drag-to-nest or drag-to-promote below `md` (768px).

**More → Move under task** (root tasks) — picker dialog.

**More → Move to root tasks** (subtasks) — same as `promoteSubtaskToRootAction`.

## Server actions

- `moveItemUnderTaskAction(planId, itemId, parentItemId)`
- `promoteSubtaskToRootAction(planId, itemId)` — alias of `moveItemToRootAction`

## Known limitations

- Promoted tasks append to end of root Tasks (not immediately after former parent).
- No drag nesting of subtasks under other parents.
- One subtask level in the UI.
- Failure message: **Couldn't move this item. Reload and try again.**
