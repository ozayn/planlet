# Mobile UX Audit — Planlet

**See also:** `docs/SYSTEM_UX_AUDIT.md` (full system pass, June 2026).

**Date:** June 2026  
**Viewport targets:** 375px (iPhone SE), 390–430px (modern iPhone), 412px (Pixel), ~667px height, PWA standalone

## Main issue (reported)

**Copy as text sheet:** On mobile, the “Copy to clipboard” button sat below the fold inside a single scroll region. Users could not scroll far enough to reach it comfortably, especially with the bottom nav and browser chrome consuming vertical space.

## Fixes made

### Copy as text modal (priority)

- Refactored `SimpleSheet` to a flex column layout:
  - `max-h-[min(90dvh, …)]` with `overflow-hidden` on the shell
  - Shrink-0 header
  - Scrollable body (`flex-1 min-h-0 overflow-y-auto`)
  - Optional sticky footer with `pb-[calc(1rem+env(safe-area-inset-bottom))]`
- Raised sheet overlay z-index to `z-[60]` (above bottom nav `z-50`)
- Moved “Copy to clipboard” + status messages into the sheet footer in `SharePlanPanel`
- Reduced preview textarea from 14 rows to 8 with `max-h-48` so format options + preview scroll, action stays pinned

### Other sheets / modals

| Surface | Change |
|---------|--------|
| Task details sheet | Save / Cancel moved to sticky footer |
| Comments sheet | Add-comment form + submit moved to sticky footer; comment list scrolls |
| Confirm dialog | `z-[60]`, safe-area bottom padding on overlay |
| Status menu | Portal menu uses `100dvh` cap, `z-[70]` |
| Notifications dropdown | `z-[70]`, scroll cap with `100dvh`, 44px bell touch target |
| Profile menu | `z-[70]`, max-width on small screens, 44px compact trigger |

### App shell & safe areas

- Main content: `pb-safe-nav` = `6rem + env(safe-area-inset-bottom)` (clears bottom nav + home indicator)
- Mobile app bar: `pt-[env(safe-area-inset-top)]`
- Bottom nav already had `pb-[env(safe-area-inset-bottom)]`

### Header (mobile)

- Already correct: logo left, notification bell + avatar right
- Settings and theme toggle live under avatar menu (not bottom nav)
- Bottom nav: Today / Plans / Insights only

### Touch targets (mobile ≤767px)

- `ui-icon-action` and `ui-icon-action-quiet` bumped to 44×44px
- Notification bell and profile avatar trigger: `min-h-11 min-w-11`
- Sheet close button: 44×44px

### Spacing

- Private observations: collapsed by default on mobile; desktop still auto-expands when observations exist
- Collapsed summary no longer duplicates “Only you can see these.” helper line

## Screens checked

| Route | Notes |
|-------|-------|
| `/today` | Plan editor, item cards, copy/share, observations, add item |
| `/plans` | Plan list, cards |
| `/plans/[id]` | Day plan editor, share panels |
| `/plans/day/[date]` | Date nav (two-row layout on narrow screens) |
| `/plans/new` | Write/Record/Image flow (inline, not sheet) |
| `/insights` | Summary cards, charts |
| `/settings` | Forms, reached via profile menu on mobile |
| `/admin` | Desktop-oriented; reachable via profile menu when admin |

## Modal / sheet scroll safety

| Surface | Primary action reachable? | Scroll-safe? |
|---------|---------------------------|--------------|
| Copy as text | Yes — sticky footer | Yes |
| Share inside Planlet | Yes — inline `<details>`, not a sheet | Yes |
| Task details | Yes — sticky footer | Yes |
| Add subtask | Yes — inline form on card | Yes |
| Task note | Yes — inside details sheet footer area (same sheet) | Yes |
| Comments | Yes — sticky footer | Yes |
| Private observations | Yes — collapsible section | Yes |
| Notifications | Yes — scrollable list | Yes |
| Profile menu | Yes — fits viewport width | Yes |
| Status dropdown | Yes — portaled, dvh-capped | Yes |
| Delete confirmation | Yes — centered dialog | Yes |
| Image import | Yes — inline on `/plans/new` | Yes |
| Audio recording | Yes — inline on `/plans/new` | Yes |
| New plan review | Yes — inline page content | Yes |

## PWA

- `viewport-fit: cover` and safe-area env vars used in shell + sheets
- `manifest.json`: standalone, icons present (`icon-192`, `icon-512`, maskable)
- Theme color meta for light/dark
- App usable with browser chrome and in installed standalone mode

## Accessibility

- Icon-only buttons retain `aria-label` / `title`
- Sheets: `role="dialog"`, labelled title, Escape to close
- Confirm dialog: `role="alertdialog"`, focus on cancel
- Focus rings via `--focus-ring` in day and night mode
- Touch targets ≥44px on primary mobile icon actions

## Mobile landscape (phone rotated)

**Target:** `max-height: 520px` + `orientation: landscape` (e.g. 667×375, 844×390, 915×412)

### Behavior

| Area | Portrait mobile | Phone landscape |
|------|-----------------|-----------------|
| Task title lines | 1 line (`line-clamp-1`) | 2 lines (`line-clamp-2`) |
| Task metadata (type · time · subtasks) | Shown below title | Hidden to save vertical space |
| Status control | Standard compact width | Narrower (~4.25–5rem) |
| Item action icons | 44×44px | 36×36px (still tappable) |
| Bottom nav | Icon + label, 60px tall | Icon-only (sr-only labels), ~44px |
| Page / plan spacing | Default | Tighter section gaps |
| Add item form | Stacked kind + input row | Single horizontal row when possible |

### Fixes

- Added landscape media block in `app/globals.css` with hooks on plan item, editor, header, nav, and form classes.
- `plan-item-card.tsx`: semantic row/content/title classes; title uses `line-clamp` instead of hard `truncate`.
- Touch landscape width ≥768px no longer hides item actions until hover (`pointer: fine` required) — fixes missing action icons on rotated phones.
- Sheets/menus unchanged; `dvh` sizing still applies in landscape.

### Screens checked (landscape)

- `/today` — task list, add item, date nav, copy sheet
- `/plans/[id]` — plan editor header + tasks

### Landscape limitations

- Very long titles still clamp at 2 lines in landscape; tap to edit for full text.
- Bottom nav labels are visually hidden in landscape (icons remain; labels stay for screen readers).
- Intention/note cards do not yet get the 2-line title treatment (tasks only).

## Remaining recommendations

1. **Keyboard overlap:** Long forms in task details may still need manual scroll when the software keyboard opens; consider `visualViewport` resize padding if reported in the field.
2. **Status menu flip:** Menu always opens below the trigger; on the last item in a long list near the bottom edge, consider flipping upward when space is tight.
3. **New plan review:** Save actions at the bottom of a long review page — acceptable today; could add a sticky save bar if users report difficulty on very small heights.
4. **Automated visual regression:** No Playwright mobile viewport tests yet; manual checklist below is the source of truth for now.

## Known limitations

- Cursor browser automation was not used for this pass; validation is code review + production build.
- `maximumScale: 1` in viewport prevents pinch-zoom (existing PWA choice); may affect accessibility for low-vision users.
- Admin table is usable on mobile but not optimized for narrow layouts.

## Manual test checklist

### `/today` mobile

- [ ] Add item
- [ ] Open status menu
- [ ] Open details
- [ ] Open task note / comments
- [ ] Open copy as text — **Copy to clipboard visible without hunting**
- [ ] Expand / collapse private observations

### `/plans` mobile

- [ ] Open date plan
- [ ] Open week plan
- [ ] Open shared plan
- [ ] No duplicate / crowded sections

### `/plans/new` mobile

- [ ] Select plan date
- [ ] Switch Write / Record / Image
- [ ] Upload image
- [ ] Review extracted text
- [ ] Structure plan
- [ ] Save

### `/settings` mobile

- [ ] Avatar menu includes Settings
- [ ] Day / night toggle works
- [ ] No layout jump

### Notifications / profile

- [ ] Notification panel scrolls
- [ ] Profile menu fits on screen

### `/today` mobile landscape (667×375, 844×390, 915×412)

- [ ] Long English task title shows more text than portrait (2 lines vs 1)
- [ ] Long Persian task title shows more text than portrait
- [ ] Status menu still opens
- [ ] Item action icons visible and tappable
- [ ] Bottom nav does not cover content
- [ ] Copy as text modal — Copy to clipboard still reachable
- [ ] Day / night mode stable
