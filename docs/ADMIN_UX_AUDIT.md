# Admin UX audit

**Goal:** Admin feels like a quiet internal utility — compact, scannable, not a dashboard.

## Changes (June 2026)

| Area | Issue | Fix | Status |
|------|-------|-----|--------|
| Page header | Long explanatory subtitle | Short: “Planlet activity and users.” | Done |
| Overview metrics | Five large `SummaryCard` tiles with accent rails | Single muted summary line: Users · Plans · Items · Shares | Done |
| Access configuration | Large top card listing all env emails with helper copy | Collapsed **Technical info** at bottom; counts + email lists inside | Done |
| Feedback | Card-style link competing with overview | Compact **Feedback** row + link to `/admin/feedback` | Done |
| Users table | 12 columns, wide min-width, heavy mobile cards | 5 columns: User, Role/capabilities, Plans, Last seen, Last login | Done |
| Mobile users | Large `ui-card-padded` grids per user | Compact divided rows with avatar + one meta line | Done |
| Recent logins | Always-visible 25-item list in card | Collapsed **Recent logins** details (default closed) | Done |
| Role display | Raw `USER` / `REFLECTOR` + separate capability line | `formatAdminRoleCapabilities` — Admin · Reflector · Feedback · Reflection | Done |
| Last seen vs login | Column named “Recently seen” | Renamed **Last seen** (activity) vs **Last login** (auth) | Done |
| Shares in summary | Always shown | Omitted when zero | Done |
| Permissions | — | Unchanged: `requireAdminUser` / `notFound` for non-admins | Done |

## Layout (current)

1. **Admin** — page header
2. **Summary line** — `Users N · Plans N · Items N` (+ Shares if &gt; 0)
3. **Feedback** — open/high counts + “Open feedback →”
4. **Users** — main table (desktop) or compact rows (mobile)
5. **Technical info** — collapsed details (emails, AI/audio/image/push)
6. **Recent logins** — collapsed details

## Remaining limitations

- No user search/filter on admin page (not implemented).
- Per-user item status, shares, and export counts removed from main table (available in DB stats if needed later).
- Admin feedback full list remains on `/admin/feedback` only.
- Email lists only visible inside expanded Technical info.

## Related

- `docs/SYSTEM_UX_AUDIT.md` — system-wide UX pass
- `lib/admin-stats.ts` — data + `requireAdminUser`
- `components/profile-menu.tsx` — Admin link gated by `isAdmin`
