# Life Areas

**Status:** Implemented (optional Plans view).

Life Areas are an optional way to view plan tasks by life domain. They follow Planlet’s simplicity-first philosophy in [DESIGN_PHILOSOPHY.md](./DESIGN_PHILOSOPHY.md).

---

## Product intent

Help users make room for different parts of life without turning balance into another productivity obligation.

Life Areas must never become mandatory setup before planning or focusing. Missing an area is never treated as failure.

---

## Behavior

1. **Optional alternative view in Plans** — `List | Life Areas` toggle. List remains the default (`User.planOrganizeView`).
2. **One primary Life Area per task** — enforced in app logic and a partial unique index.
3. **Optional secondary Life Areas** — soft associations; do not duplicate task rows or time.
4. **Tasks can remain uncategorized**.
5. **No duplicate task display** — grouping uses primary only.
6. **No double-counting of time (future)** — attribute to primary only when time tracking is added.
7. **All active areas visible** — Life Areas view lists every non-archived area in catalog order, including empty ones as compact `+ Add` rows. Areas with tasks expand by default; empty areas stay quiet. Uncategorized appears only when it has tasks.
8. **Task creation** — area assignment lives in the task details sheet; Life Areas view also supports **+ Add** on an area (assigns that area as primary). Uncategorized tasks show **+ Area**. Categorized tasks use **Change area** in the task More menu.
9. **Customizable areas** — Settings → Planner → Life Areas → Manage (dedicated `/life-areas` page for add / rename / reorder / archive / restore). Defaults seed once when the user has none.
10. **Default name refresh** — legacy seeded names (e.g. Career & Job Search) rename in place to the permanent defaults when they still match exactly. IDs and associations are preserved; customized names are never overwritten.
11. **Copy as text** — optional **By Life Area** format groups shareable root tasks by primary area (empty areas omitted from export). Secondary areas never duplicate rows. Private items stay excluded.
12. **Deferred** — weekly overview rollups, Pomodoro / Activity Timer by area, planned vs actual time, optional weekly intentions.

---

## Data model

- `LifeArea` — per-user named areas (`sortOrder`, `archivedAt`)
- `PlanItemLifeArea` — `(planItemId, lifeAreaId)` unique; at most one `isPrimary = true` per item

Tasks are never duplicated. Subtasks stay nested under parents; they do not auto-copy associations.
