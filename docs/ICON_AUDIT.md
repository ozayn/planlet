# Icon audit

**See also:** `docs/SYSTEM_UX_AUDIT.md` (full system pass, June 2026).

Planlet uses inline SVG icons (Lucide-equivalent shapes) from a single source of truth. Labels live in `lib/action-labels.ts`.

**Source files**
- Icons: `components/ui/action-icons.tsx`
- Labels: `lib/action-labels.ts`
- Legacy re-exports: `components/plans/item-action-icons.tsx` (Edit, Comment, Subtask, StickyNote, Trash)
- Button styles: `ui-icon-action`, `ui-icon-action-quiet` in `app/globals.css`

**Note:** `lucide-react` is not installed. Icons are hand-drawn SVGs matching Lucide naming for future migration.

## Standard mapping

| Action | Standard icon | Label (title / aria) | Used in |
|--------|---------------|----------------------|---------|
| Copy as text | `ClipboardCopyIcon` | Copy as text / Copy plan as text | `share-plan-panel.tsx`, plan header |
| Share inside Planlet | `UserPlusIcon` | Share inside Planlet | `plan-header-actions.tsx`, `share-with-user-panel.tsx` |
| More (plan) | `MoreHorizontalIcon` | More / More plan actions | `plan-more-menu.tsx`, `delete-plan-menu.tsx` |
| More (item) | `MoreHorizontalIcon` | More / More item actions | `item-actions-menu.tsx` |
| Edit item | `PencilIcon` (`EditItemIcon`) | Edit / Edit item (type-specific via `getItemActionLabels`) | Item cards, item menus |
| Item details sheet | `PencilIcon` | Same as edit — opens full details | Desktop row icons |
| Add subtask | `ListPlusIcon` (`AddSubtaskIcon`) | Add subtask | `plan-item-card.tsx`, item menu |
| Private task note | `StickyNoteIcon` | Task note | `plan-item-card.tsx`, item menu |
| Shared comments | `MessageCircleIcon` (`CommentIcon`) | Comments | `item-comments-button.tsx`, item cards |
| Delete item | `Trash2Icon` (`TrashIcon`) | Delete / Delete item | Item menu (red) |
| Delete plan | `Trash2Icon` | Delete plan | `plan-more-menu.tsx`, `delete-plan-menu.tsx` |
| Summary | `FileTextIcon` | Summary / View summary | `plan-more-menu.tsx`, `plan-list-item.tsx` |
| Previous / next day | `ChevronLeftIcon` / `ChevronRightIcon` | Previous day / Next day | `day-plan-nav.tsx` |
| Previous / next week | `ChevronLeftIcon` / `ChevronRightIcon` | Previous week / Next week | `week-plan-nav.tsx` |
| Choose date/week | `CalendarIcon` | Choose plan date / Choose week | Day & week nav |
| Expand / collapse | `ChevronDownIcon` | (context label on parent) | Status trigger, share panel, observations |
| Status selected | `CheckIcon` | — | Status menu |
| Reorder | `GripVerticalIcon` | Drag to reorder item | `plan-item-card.tsx` |
| Notifications | `BellIcon` | Notifications | `notification-bell.tsx` |
| Theme day/night | `SunIcon` / `MoonIcon` | (segment labels in toggle) | `theme-toggle.tsx` |
| Kudos summary | `SparklesIcon` | Kudos from N people | `plan-kudos-summary.tsx` |
| Private observations | `LockIcon` | Private observations | `private-observations-section.tsx` |
| Intention leading | ✨ emoji | — | `intention-item-card.tsx` |
| Note leading | `StickyNoteIcon` | — | `note-item-card.tsx` |
| Status values | Expressive emoji / minimal glyphs | Per-status labels | `status-button.tsx`, `plan-item-status-visual.tsx` |
| Kudos reactions | Emoji per type | Per-type labels | `send-kudos-panel.tsx` |

## Changes made (this audit)

1. **Centralized icons** — Created `components/ui/action-icons.tsx` with 20+ shared icons.
2. **Centralized labels** — Created `lib/action-labels.ts` for consistent `title` / `aria-label` on icon-only controls.
3. **Removed duplicate local SVGs** from: `plan-header-actions`, `share-plan-panel`, `plan-more-menu`, `item-actions-menu`, `share-with-user-panel`, `day-plan-nav`, `week-plan-nav`, `private-observations-section`, `notification-bell`, `theme-toggle`, `plan-kudos-summary`, `status-button`, `plan-item-card`.
4. **Fixed `delete-plan-menu`** — Replaced text `⋯` trigger with `MoreHorizontalIcon`, added `Trash2Icon` on delete row, aligned menu row styling with other overflow menus.
5. **Unified More icon** — Item and plan overflow menus both use `MoreHorizontalIcon`.
6. **Unified Trash** — All delete actions use `Trash2Icon` with `text-accent-red` in menus.
7. **Unified comments** — All comment buttons use `MessageCircleIcon` via `CommentIcon` re-export.
8. **Unified task note** — `StickyNoteIcon` + `ACTION_LABELS.taskNote` everywhere.
9. **Summary link** — Plan list summary uses `FileTextIcon` + standard labels.
10. **Backward compatibility** — `item-action-icons.tsx` re-exports from central map so existing imports keep working.

## Inconsistencies found

| Issue | Locations | Resolution |
|-------|-----------|------------|
| Duplicate `UserPlusIcon` SVG | plan header, share panel | Centralized |
| Duplicate `TrashIcon` SVG | plan more, item menu, delete menu | Centralized as `Trash2Icon` |
| Duplicate `MoreHorizontal` / `MoreIcon` | plan more, item actions | Single `MoreHorizontalIcon` |
| Duplicate chevrons + calendar | day nav, week nav | Centralized |
| Duplicate `Lock` + chevron | private observations | Centralized |
| `delete-plan-menu` used `⋯` text, no trash icon | plan list | Fixed |
| Copy labels as local constants | share panel | Uses `ACTION_LABELS.copy` |
| Drag handle inline SVG | plan item card | `GripVerticalIcon` |
| No lucide-react dependency | whole app | Documented; inline SVGs match Lucide names |

## Remaining exceptions

| Exception | Reason |
|-----------|--------|
| **Bottom nav icons** (`bottom-nav.tsx`) | Route-specific nav glyphs (clock, list, chart). Not action buttons; kept local. |
| **Intention ✨ emoji** | Product choice for intentions section; not a Lucide icon. |
| **Kudos picker emojis** (`send-kudos-panel.tsx`) | Reaction types use emoji labels by design. |
| **Status expressive icons** | Status system uses emoji/glyphs per `PlanItemView`; separate from action icons. |
| **Google sign-in logo** | Brand asset, not an action icon. |
| **Planlet logo** | Brand mark. |
| **Pencil for “Edit” that opens details sheet** | Same action as menu “Edit”; SlidersHorizontal reserved for a future dedicated details-only entry if split. |
| **Profile uses avatar, not icon** | Account menu is avatar-driven by design. |
| **Observation row Edit/Delete as text buttons** | Inline text actions in expanded list; not icon buttons. |

## Icon button styles

Use existing utilities — no separate `IconButton` component:

| Class | Use |
|-------|-----|
| `ui-icon-action` | Plan header actions (copy, share, more) — 40px mobile / 44px touch |
| `ui-icon-action-quiet` | Item row actions, list delete more — subtle, hover reveal on desktop |
| `ui-icon-action-quiet-active` | Toggled state (e.g. subtask form open) |

Danger delete rows: `text-accent-red` + `Trash2Icon`, consistent in all overflow menus.

## Menu rules

- Same `MoreHorizontalIcon` on all overflow triggers.
- Menu rows: `min-h-10`, `gap-2.5`, `px-3`, icon `h-4 w-4 text-muted`.
- Delete: red text + trash icon.
- Mobile: if action is visible inline, omit from More (`visibleActionsAreShown` pattern).
