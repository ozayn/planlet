# Planlet system UX audit

June 2026 — full pass across landing, mobile, desktop, roles, and copy/share.

Design principles applied:

1. Same action → same icon/label/behavior
2. Common actions → visible icon or direct interaction
3. Rare/destructive → More menu
4. No duplicate inline + More at the same breakpoint
5. Mobile rows prioritize content
6. Settings/account/admin/feedback → avatar menu only
7. Landing explains Planlet simply
8. Help text only where it prevents confusion
9. Compact empty states
10. Private/advanced features gated and collapsed

---

## Overall findings

Planlet already follows a strong minimal direction from prior passes (June 2026). Navigation IA is correct: three primary tabs, avatar for account tools. Item cards use `visibleActionsAreShown` to avoid mobile/desktop duplication. Copy/share and in-app share are distinct actions with centralized icons.

Remaining issues were mostly **copy drift**, **small redundancies**, and **inconsistent private-section patterns** — not structural rewrites.

---

## Fixes made (this pass)

| Area | Issue | Fix | Status |
|------|-------|-----|--------|
| Landing `/` | Hardcoded tagline; feature-dense subtitle; “Continue with Google” | Use `PRODUCT.tagline`; three short bullets; privacy line; “Get started with Google” | Done |
| Nav | Duplicate `navItems` in bottom + desktop nav | `config/nav-items.ts` shared `MAIN_NAV_ITEMS` | Done |
| Task cards (desktop) | Edit + Note both opened same sheet with no distinction | Note icon focuses comment field in details sheet | Done |
| Task cards (desktop) | “Task” in meta under every row | Hide type label when `TASK` (match mobile) | Done |
| Observations/gratitude | `window.confirm` for delete | `ConfirmDialog` (matches items/plans) | Done |
| Observations/gratitude | Repeated privacy helper under each section | Removed; lock icon in header only | Done |
| Period summaries | Mixed privacy wording | Unified “Only you can see these. Not shared or exported.” | Done |
| Insights | Double intro (header + paragraph) | Single `PageHeader` subtitle | Done |
| New plan | Verbose page subtitle | “Write, record, or import — then review and save.” | Done |
| Settings | Theme toggle locations unclear | One-line note under Appearance | Done |
| Notes section | Long helper under heading | Shortened to one line | Done |
| Plans | Dead `plan-a-date-card` / `plan-a-week-card` | Removed (superseded by `PlanQuickOpen`) | Done |

---

## Landing page

**Before:** Mobile-first/calendar wording duplicated metadata; single CTA without context bullets.

**After:** Hero uses product tagline; one-line value prop; primary CTA; three bullets (write/speak, structure, share); privacy line. No admin/roles/feedback/technical terms.

**Intentionally left:** Decorative footer accent bars; signed-in redirect to `/today`.

---

## Navigation

| Surface | Primary nav | Avatar menu |
|---------|-------------|-------------|
| Mobile top | Logo, bell, avatar | Theme, Settings, Feedback*, Admin*, Sign out |
| Mobile bottom | Today, Plans, Insights | — |
| Desktop | Today, Plans, Insights | Settings, Feedback*, Admin*, Sign out |
| Desktop header | Bell, theme toggle, avatar | — |

\*Gated by capability/role.

**No duplicate Settings/Admin/Feedback in bottom nav** — verified.

**Theme:** three entry points (desktop header, mobile profile, Settings). Documented in Settings; not removed (discoverability).

**Support Planlet:** not implemented; Feedback + Share inside Planlet are the equivalents.

---

## Today / plan pages

- Title: click-to-edit via `EditablePlanTitle`
- Header cluster: Copy (icon) · Share inside Planlet (icon) · More (delete, summary*)
- Share panel: header icon + disclosure row (intentional dual entry)
- Mobile items: status · title · More; metadata subline only when informative
- Desktop items: edit, subtask, note (focuses comment), comments, More (delete only on md+)
- Desktop task drag: vertical reorder; drag right ≥36px over root task to nest; drag subtask left ≥36px to promote to root (see `docs/DRAG_NESTING.md`)
- Mobile tasks: More → Move under task / Move to root tasks (no drag nest/promote)
- Private observations/gratitude: capability-gated, collapsed on mobile when empty, not in shared view

\*Summary in More when `periodSummaryHref` passed (month/year on `/plans/[id]`; week summary also in week page header).

---

## Plans page

- Quiet list layout with Quick open rows
- Shared / Your plans sections; empty groups hidden
- Summary in plan list More menu (not large cards)

---

## New plan flow

- Plan target vs input mode labeled distinctly (“Plan for” / “Input mode”)
- Single primary per step: Structure plan / Save plan
- Page subtitle shortened

**Remaining:** date/header may appear on input + review steps (acceptable for edit-before-save).

---

## Insights

- Compact stat grid, combined breakdown, period chips
- Reflection observations gated
- Footer: “These are observations, not grades.”

---

## Settings

- Row/section layout: Profile, Appearance, Planning, Capabilities*, App & notifications, Technical info
- Sign out in profile section (also in avatar menu — discoverability)

---

## Admin & feedback

- Admin: functional cards + table; feedback link with open/high counts
- Feedback: avatar entry only; `/feedback` compact form + my list; `/admin/feedback` for triage
- Terminology separated: Feedback ≠ Comments ≠ Task note ≠ Observation ≠ Gratitude

---

## Copy / share / privacy

- Copy as text: icon-only trigger; sticky footer on mobile; private items excluded
- Observations/gratitude never in copy/export by default
- Shared viewers: read-only plan, no private sections

---

## Redundancies found (not all fixed)

| Area | Issue | Status |
|------|-------|--------|
| Theme toggle ×3 | Desktop header + mobile profile + Settings | Documented; left as-is |
| Sign out ×2 | Profile menu + Settings | Left as-is (discoverability) |
| Share in-app ×2 | Header icon + disclosure | Intentional |
| Observations/gratitude UI | ~parallel components | Shared `private-entry-actions-menu.tsx` for row Edit/Delete; list primitive still separate |
| Admin metrics | Large dashboard cards + repeated counts | Compact summary line + simplified users table | Done |
| New plan date copy | Input + review both show date | Left as-is |
| Auth loading | `return null` while session resolves | Left as-is (low risk) |

---

## Role behavior verified

| Role | Landing | Plans/tasks | Reflection | Feedback | Admin |
|------|---------|-------------|------------|----------|-------|
| USER | Public | Full | Hidden | Hidden | Hidden |
| REFLECTOR | Public | Full | Own plans | Hidden* | Hidden |
| FEEDBACK | Public | Full | Hidden* | Yes | Hidden |
| ADMIN | Public | Full | Yes | Yes | Yes |
| Shared viewer | N/A | Read-only | Hidden | Hidden | Hidden |

\*Unless both capabilities assigned via env lists.

---

## Remaining recommendations

1. **Auth loading shell** — minimal spinner/skeleton instead of blank `null` on app pages.
2. **Reflection section primitive** — extract shared collapsible list shell from observations + gratitude (row actions now shared).
3. **New plan review** — sticky Save bar on small screens (see `MOBILE_AUDIT.md`).
4. ~~**Admin mobile table**~~ — compact user rows on mobile; see `docs/ADMIN_UX_AUDIT.md`.
5. **404 / unauthorized pages** — friendly copy for `/feedback` and gated routes.
6. **E2E smoke** — Playwright for copy modal, item More menu, role gating.

---

## Related docs

- `docs/MOBILE_AUDIT.md` — safe areas, copy sheet footer, touch targets
- `docs/ADMIN_UX_AUDIT.md` — minimal admin page layout
- `docs/REDUNDANCY_AUDIT.md` — inline vs More menu rules (updated: Settings not in desktop nav)
- `docs/ICON_AUDIT.md` — centralized action icons
- `docs/UX_AUDIT.md` — earlier refinement pass

---

## Manual test checklist

**Mobile:** landing · today · plans · new plan · insights · settings · avatar menu · copy modal · item More · private sections collapsed · shared plan

**Desktop:** landing · nav · plan page · plans list · insights · settings · admin · feedback admin

**Roles:** USER · REFLECTOR · FEEDBACK · ADMIN · shared viewer

Build: `./scripts/build.sh`
