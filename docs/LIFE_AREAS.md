# Life Areas

**Status:** Implemented (optional Plans view).

Life Areas are an optional way to view plan tasks by life domain. They follow Planlet’s simplicity-first philosophy in [DESIGN_PHILOSOPHY.md](./DESIGN_PHILOSOPHY.md).

---

## Product intent

Help users optionally group tasks by life domain without turning Plans into a categorization chore.

Life Areas must never become mandatory setup before planning or focusing.

---

## Behavior

1. **Optional alternative view in Plans** — `List | Life Areas` toggle. List remains the default (`User.planOrganizeView`).
2. **One primary Life Area per task** — enforced in app logic and a partial unique index.
3. **Optional secondary Life Areas** — soft associations; do not duplicate task rows or time.
4. **Tasks can remain uncategorized**.
5. **No duplicate task display** — grouping uses primary only.
6. **No double-counting of time (future)** — attribute to primary only when time tracking is added.
7. **Task creation unchanged** — area assignment lives in the task details sheet (collapsed).
8. **Customizable areas** — Settings → Planner → Life Areas → Manage (dedicated `/life-areas` page for add / rename / reorder / archive / restore). Defaults seed once when the user has none.
9. **Deferred** — Pomodoro / Activity Timer rollups, weekly intentions, balance summaries.

---

## Data model

- `LifeArea` — per-user named areas (`sortOrder`, `archivedAt`)
- `PlanItemLifeArea` — `(planItemId, lifeAreaId)` unique; at most one `isPrimary = true` per item

Tasks are never duplicated. Subtasks stay nested under parents; they do not auto-copy associations.
