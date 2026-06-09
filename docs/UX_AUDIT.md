# Planlet — UX audit (refinement pass)

A focused clarity pass across major screens. No new features, no data model or auth changes.

## Main issues found

1. **Plan item cards were too busy** — status, type select, three buttons, and inline comments competed with the title on the primary editing surface.
2. **Two “share” flows used overlapping language** — clipboard export and in-app sharing both felt like “Share.”
3. **Today lacked context** — date and item count were hidden when `showMeta={false}`; only a lone share button floated at the top.
4. **Repeated copy** — “messy list,” “Good enough counts,” and Farsi/English reminders appeared on many screens.
5. **Plans page duplicated navigation** — Quick actions repeated Today and New plan already available elsewhere.
6. **Settings exposed dev diagnostics** — API keys, model names, and provider env details on a user settings page.
7. **Insights tone could feel evaluative** — similar hints (“moved forward” vs “often moved”) and dense sections.
8. **Dashboard was orphaned** — `/dashboard` existed but was not in nav; post-login goes to `/today`.
9. **New plan review showed raw enums** — `DAY`, `FA`, `MORNING` broke label consistency.
10. **Admin page felt like a second product dashboard** — long helper text and competing visual weight.

## Changes made

### Plan editor
- Default item card: status, title, type/time meta line, Details + Add subtask as text links.
- Type select, delete, and advanced fields moved to Details sheet.
- Details sheet grouped into Progress, Feeling, Priority, Timing, Sharing, Notes.
- Delete moved into Details (less prominent).
- Comments no longer shown on the default card.

### Sharing
- Clipboard export renamed to **Copy as text** everywhere.
- In-app sharing stays **Share inside Planlet**, collapsed by default, with read-only and invite copy.
- Checkbox label: **Include when copying as text**.

### Navigation and pages
- `/dashboard` redirects to `/today`.
- Today: quieter “New plan from notes” link in header; date + item count shown.
- Plans: removed duplicate quick actions; **Create by type** for daily/monthly/yearly only.
- Settings: simplified to profile, sign out, app info, install — no env diagnostics.
- Admin: shorter copy, utility styling, counts-only reminder.

### New plan flow
- Step labels: **Step 1 — Input** / **Step 2 — Review**.
- Record toggle shortened to **Record**; audio block styled as part of the flow.
- Human-readable labels in review (plan type, language, time hints, priority).
- Today-append note made smaller and subtler.

### Insights
- Reflective copy: “What your plans contained,” “Finished or partly done,” “Deferred or skipped.”
- Priority section renamed; footer keeps “observations, not grades.”

### Visual system
- Shared `.ui-empty-state`, `.ui-section-title`, `.ui-text-link` classes.
- Improved focus-visible on inputs and ghost buttons.
- Landing page copy shortened; accent bars reduced to thin footer markers.
- Bottom nav Settings accent aligned with calm gray (not black).

## Design principles reinforced

- **Clarity over cleverness** — one obvious path to item details.
- **Fewer visible controls by default** — progressive disclosure in Details.
- **Calm hierarchy** — primary actions stand out; meta and helpers are quieter.
- **Conventional interactions** — text links, collapsible sections, grouped form fields.
- **Artistic restraint** — Mondrian accents as small bars and selected states, not colorful UI.
- **No productivity pressure** — insights framed as observations, not grades.

## Remaining UX opportunities

- Custom 404 / friendlier “plan not found” page.
- Replace `window.confirm` for delete with an in-app confirmation pattern.
- Skeleton or loading state while auth session resolves (pages currently return `null`).
- Optional: further collapse Insights sections when data is sparse.
- Plan list empty states inside sections could share one CTA pattern.
- Parsed plan review could hide priority/time fields behind an “Advanced” toggle.
