# Planlet UI Redundancy Audit

Audit date: June 2026. Goal: find and reduce duplicate actions, repeated labels, and overlapping UI patterns without removing functionality.

**See also:** `docs/SYSTEM_UX_AUDIT.md` (full system pass, June 2026).

**Correction:** Settings is **not** in the desktop main nav — only in the avatar/profile menu (same as mobile).

## Rule of thumb

**If an action is visible on the row (or header) at a breakpoint, do not repeat it in the overflow menu at that same breakpoint.**

---

## Summary table

| Area | Redundancy found | Fix made | Remaining note |
|------|------------------|----------|----------------|
| Item cards | Edit/Subtask/Note/Comments in row + More menu (desktop) | `visibleActionsAreShown` prop — desktop More = Delete only; mobile More = full set | Note/intention cards always show row icons → More stays Delete-only |
| Item cards | Status label repeated in mobile metadata under status icon | Removed status from mobile metadata line | Type + note/comment indicators remain |
| Plan header | "Edit title" in More menu while title is click-to-edit | Removed Edit title from `PlanMoreMenu` | Click title or use keyboard focus |
| Plan header | Share icon in header + disclosure row below | Left as-is | Dual trigger is intentional: header toggles, row shows compact status |
| Plan header | Copy icon vs "Copy as text" modal | Left as-is | Icon opens modal; labels differ by design |
| Plans page | "New plan" in header + empty state | Left as-is on Plans page | Empty state is only CTA when list empty |
| Today page | "New plan" header link + "Create today's plan" empty CTA | Hide header "New plan" when no plan exists | One primary action when empty |
| Today page | Date in `DayPlanNav` + `PlanMetadata` date line | `PlanMetadata` `compact` mode on Today (`showMeta={false}`) | Shows items · updated only |
| New plan flow | Step labels + page subtitle; date in input + review | Not changed | Low-risk copy trim deferred |
| Sharing/kudos | Kudos avatars + "sent kudos" text | Removed visible "sent kudos"; kept `aria-label` | Avatars-only row |
| Sharing/kudos | Share panel "Not shared yet" + helper text | Removed empty list line | Helper text sufficient |
| Sharing/kudos | Recent recipients include already-shared users | Already filtered in `getRecentShareRecipients` | No change needed |
| Notes/observations/comments | Unclear distinction between NOTE items and private observations | Added helper copy on Notes section + observations expanded text | Task note still in details sheet |
| Navigation | Settings in desktop nav + profile menu; theme in 3 places | Settings helper text clarified | Full nav consolidation deferred |
| Settings | Theme toggle in nav + settings + profile | Clarified helper text only | Intentional: quick vs full controls |
| Admin | Login metrics in overview + user table | Left as-is | Summary + detail is acceptable |
| Copy/export | "Copied" status line + button label | Removed redundant status paragraph | Button shows Copied state |
| Copy/export | Pretty plan vs Simple text descriptions similar | Sharpened format descriptions in `SHARE_UI_FORMAT_META` | Formats differ in output |
| Dead code | Unused share/list components | Deleted 4 unused files | See list below |

---

## Item cards

### Findings
- Desktop row showed Edit, Subtask, Note, Comments icons while More menu repeated Edit, Subtask, Note, Comments, Delete.
- Mobile correctly hid row icons; More menu carried all actions.
- Mobile metadata repeated status text already shown in status icon.
- Desktop Edit icon opens details sheet; mobile More "Edit" does the same — not duplicate at same breakpoint after fix.
- Task note icon and details sheet both access note field — icon is quick entry, sheet is advanced; acceptable.

### Fixes
- `ItemActionsMenu`: `visibleActionsAreShown` — overflow-only (Delete) vs full menu.
- `plan-item-card`: `useMediaQuery("(min-width: 768px)")` drives prop; desktop Note icon added so Note isn't menu-only on desktop.
- Removed `statusLabel` from mobile metadata line.

### Remaining
- Note/intention cards show Edit + Comments on all breakpoints → More is Delete-only always (correct).

---

## Plan header

### Findings
- Click-to-edit title + "Edit title" in More menu.
- Header cluster: Copy, Share (UserPlus), More — matches desired pattern.
- Share header icon and `ShareWithUserPanel` disclosure row both toggle same panel.
- `DeletePlanMenu` on plan list vs `PlanMoreMenu` on editor — separate but same confirm copy.
- Week plan Summary link in page header and potentially in more menu — week editor doesn't pass `periodSummaryHref` today.

### Fixes
- Removed Edit title from More menu and `onEditTitle` wiring.
- `PlanMetadata` `compact` when `showMeta={false}` (Today).

### Remaining
- Share: header icon + collapsed row (intentional dual entry).
- Unify delete confirm between list and editor (future refactor).
- Pass `periodSummaryHref` to week `PlanEditor` or remove duplicate Summary from list — pick one entry point.

---

## Plans page

### Findings
- Header "New plan" + `PlansEmptyState` link when no plans — acceptable (empty state is primary).
- Quick open (Plan a date / Plan a week) overlaps Today nav and daily plans in "Your plans" — by design for discovery.
- No duplicate plan cards across sections (shared vs owned are separate).
- Dead components: `create-plan-buttons`, `upcoming-day-plans`, `upcoming-week-plans` were never wired.

### Fixes
- Deleted unused components.

### Remaining
- Quick open defaults to today — could default to another date to reduce Today overlap (product decision).

---

## Today page

### Findings
- Two create flows: header "New plan" (import) vs "Create today's plan" (blank).
- Triple date context: PageHeader "Today", DayPlanNav, PlanMetadata date.
- Empty hint above add form duplicated add form placeholder.

### Fixes
- Hide header "New plan" when no plan.
- Compact metadata (no date line).
- Removed separate empty-state hint above `AddItemForm`.

### Remaining
- PageHeader "Today, {name}" + editable plan title — intentional personalization vs plan name.

---

## New plan flow

### Findings
- Page subtitle + step labels repeat flow stages.
- Plan target selected in input step and editable again in review.
- Detected header shown in input step and review title field.
- Image date hint in input and review.

### Fixes
- None in this pass (copy-only; review step is source of truth by design).

### Remaining
- Consider hiding detected header on input step once review is reached.
- Single "Structure plan" / "Save plan" primary per step — already mostly true.

---

## Sharing / kudos

### Findings
- "Copy as text" (clipboard) vs "Share inside Planlet" (UserPlus) — different actions, similar "share" word.
- Kudos: avatar stack + "sent kudos" + aria "Kudos from N people".
- Expanded share panel: helper + "Not shared yet" when empty.
- `OpenFullPlanShareLink` was dead code.

### Fixes
- Kudos: avatars only, aria-label retained.
- Removed "Not shared yet" line.
- Deleted `open-full-plan-share-link.tsx`.
- Copy format descriptions differentiated.

### Remaining
- Header share icon + disclosure row (see Plan header).
- Consider tooltip "Copy for messaging" vs "Invite Planlet user" for clearer distinction.

---

## Notes / observations / comments

### Conceptual model

| Feature | Scope | Visibility |
|---------|-------|------------|
| Notes & reflections (NOTE items) | Plan-level | In share/copy export |
| Private observations | Plan-level | Owner only, not exported |
| Task note (details sheet) | Per task | Owner only, in export if shareable |
| Comments | Per task | Shared viewers can participate |

### Findings
- Labels did not explain distinctions.
- Private observations showed count "0" and duplicate empty hints.
- Kudos hidden when empty; observations always shown — inconsistent empty UX.

### Fixes
- Notes section helper: included in share/copy.
- Observations expanded helper: owner-only, not shared/exported.
- Hide observation count when zero; removed redundant empty list hint.

### Remaining
- Observations section still visible when empty (collapsed) — allows add without extra entry point.
- Task note vs details sheet overlap is intentional (quick vs advanced).

---

## Navigation

### Findings
- Desktop nav: Today, Plans, Insights, Settings.
- Mobile bottom nav: Today, Plans, Insights.
- Mobile profile: theme, Settings, Admin, Sign out.
- Settings page: full theme toggle + sign out + profile block duplicating profile menu.

### Fixes
- Settings theme helper clarifies desktop nav vs mobile profile paths.

### Remaining
- Settings + profile menu both link to Settings on mobile — acceptable (compact vs full page).
- Sign out on Settings and profile — both kept for discoverability.
- Extract shared nav config (`desktop-nav` / `bottom-nav`) — future cleanup.

---

## Settings

### Findings
- Theme in nav, profile menu, and settings card.
- Push install copy may overlap general install section.
- Dev "App" config card visible to all users.

### Fixes
- Theme helper text only.

### Remaining
- Consolidate install instructions under push section.
- Hide dev config unless features unavailable.

---

## Admin

### Findings
- Overview totals vs per-user table columns overlap.
- "Recent logins" list vs "Last login" column in users table.
- "Recently seen" vs "Last login" — different metrics, labels can confuse.

### Fixes
- None (documentation only).

### Remaining
- Collapse recent logins into users table or add tooltips defining each metric.

---

## Copy / export

### Findings
- Footer showed "Copied…" and button "Copied" simultaneously.
- Pretty plan vs Simple text descriptions were vague.

### Fixes
- Removed duplicate copied paragraph.
- Sharpened `SHARE_UI_FORMAT_META` descriptions.

### Remaining
- Private observations already excluded from export pipeline — verified in share helpers.

---

## Files changed in this pass

- `components/plans/item-actions-menu.tsx` — responsive menu contents (prior pass)
- `components/plans/plan-item-card.tsx` — desktop note icon, metadata, media query
- `components/plans/plan-more-menu.tsx` — removed Edit title
- `components/plans/plan-header-actions.tsx` — removed onEditTitle
- `components/plans/plan-editor.tsx` — compact metadata, removed empty hint
- `components/plans/plan-metadata.tsx` — `compact` prop
- `app/(app)/today/page.tsx` — conditional header action
- `components/plans/plan-kudos-summary.tsx` — removed redundant label
- `components/plans/share-with-user-panel.tsx` — removed empty list line
- `components/plans/share-plan-panel.tsx` — removed duplicate copied text
- `components/plans/private-observations-section.tsx` — count, helper, empty copy
- `components/plans/plan-item-sections.tsx` — notes helper
- `app/(app)/settings/page.tsx` — theme helper
- `lib/share-plan.ts` — format descriptions
- **Deleted:** `open-full-plan-share-link.tsx`, `create-plan-buttons.tsx`, `upcoming-day-plans.tsx`, `upcoming-week-plans.tsx`

---

## Manual test checklist

- [ ] `/today` desktop: row icons + More = Delete; no duplicate Edit in menu
- [ ] `/today` mobile: More = full actions; compact metadata
- [ ] `/today` empty: only Create today button, no header New plan
- [ ] `/plans` — no duplicate cards; shared section only when non-empty
- [ ] `/plans/[id]` — click title to edit; More = Delete + Summary (month/year)
- [ ] `/plans/new` — single primary save on review
- [ ] Shared read-only — no edit/delete; comments work
- [ ] Settings / admin — no regressions
- [ ] `./scripts/build.sh` passes
