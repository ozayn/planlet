# Planlet — Admin

The `/admin` page is available only to users with the `ADMIN` role (configured via `PLANLET_ADMIN_EMAILS`).

## What admins can see

- Environment allowlists (`ALLOWED_EMAILS`, `PLANLET_ADMIN_EMAILS`)
- Global usage totals (users, plans, items, plan shares)
- Per-user counts: plans, items, done/partial/moved status counts, share activity
- Login summary: `lastLoginAt`, `loginCount`, and the 25 most recent sign-in events

## Privacy

Admin analytics are **counts and metadata only**:

- No plan titles
- No item text or comments
- No raw plan input or audio transcripts
- No clipboard export contents

## Login history

On each successful Google sign-in, Planlet updates:

- `User.lastLoginAt`
- `User.loginCount`
- A `LoginEvent` row with email, provider, and timestamp

Login events do **not** store raw IP addresses or user agents in the current MVP.

To add or remove workspace users, edit `ALLOWED_EMAILS` in environment variables and redeploy.
