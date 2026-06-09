# Planlet — Redundancy audit

Focused pass to remove duplicate navigation, copy, and controls without changing features or behavior.

## Redundancies found

### Navigation
- Settings appeared in main nav and profile menu (fixed previously).
- Admin linked in profile menu, Settings, and Admin page header.
- Dashboard duplicated Today (already redirects to `/today`).
- New plan reachable via header link, empty-state links, and plan editor empty copy on the same screens.

### Page overlap
- Today showed both **Copy as text** and **Share inside Planlet** — two sharing concepts on the daily view.
- Settings Admin button duplicated profile menu Admin link.
- Profile menu showed “Admin” label and Admin link for the same role.

### Copy
- Farsi/English note on New plan input, audio recorder, and landing page.
- “These are observations, not grades” twice on Insights (empty + populated).
- Sharing explained in panel header and expanded body.
- Admin privacy note in subtitle and separate line.
- Plan editor empty state repeated New plan links already in page headers.

### Plan editor
- Title editable on card and again in Details sheet.
- Progress group label duplicated inside Details.

### Empty states
- Today, Plans, and Insights empty states repeated New plan CTAs already in page headers.
- Plans empty offered two CTAs when header already had New plan.

## Changes made

| Area | Change |
|------|--------|
| **Sharing** | Split `showCopyExport` / `showPlatformShare` on `PlanEditor`. Today: copy only. Plan detail: both. |
| **Admin access** | Removed Admin button from Settings; kept in profile menu only. |
| **Profile menu** | Removed redundant “Admin” text label under email. |
| **Today** | Normalized header CTA to “New plan”; shortened empty state; removed inline New plan link. |
| **Plans empty** | One line + Create today’s plan only (header keeps New plan). |
| **Insights empty** | One sentence, one primary CTA, observations line once. |
| **Plan editor empty** | “Add an item below.” only. |
| **Details sheet** | Removed Title field (edit on card). Fixed Progress label duplication. |
| **New plan** | Shorter review copy; Farsi note only on input step; removed audio intro line. |
| **Share panels** | Shorter copy; platform share header only shows count when collapsed. |
| **Admin page** | Merged privacy note into subtitle. |
| **Landing** | Removed duplicate “Farsi-friendly input” under sign-in (tagline covers intent). |

## Intentional duplicates kept

| Duplicate | Why |
|-----------|-----|
| **New plan** on Today header and Plans header | Primary action in two natural entry points. |
| **Sign out** in profile menu and Settings | Quick access vs account page. |
| **Copy as text** on Today and plan detail | Both are natural export contexts. |
| **Settings profile block** vs profile menu identity | Settings is the account page; menu is quick access. |
| **Create today’s plan** on Today empty and Plans empty | Context-specific primary action when no today plan / no saved plans. |
| **Farsi/English note** on New plan input only | Shown where users paste or record content. |

## Remaining opportunities

- Custom 404 instead of generic `notFound()`.
- Replace `window.confirm` for item delete.
- Parsed plan review could hide priority/time fields behind “Advanced.”
- Insights could collapse sections when counts are zero.
- Platform sharing for today’s plan is only on plan detail URL (if user bookmarks `/today`, invite flow is one navigation step away).
