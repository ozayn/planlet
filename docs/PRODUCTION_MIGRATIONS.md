# Production database migrations (Railway)

Planlet **does not** run Prisma migrations automatically on Railway deploy.

`railway.json` / `railway.reminders.json` only build and start the app (or cron). Schema changes ship as files under `prisma/migrations/` and must be applied **once** against the production Postgres with:

```bash
npx prisma migrate deploy
```

(or the npm alias `npm run db:migrate`)

## Why this matters

If code that queries a new table (for example `PomodoroPushJob`) deploys before `migrate deploy` runs, production will throw:

```text
The table public.PomodoroPushJob does not exist.
```

The `planlet-reminders` cron (`npm run cron:reminders`) will crash on every run until pending migrations are applied.

## Intended database layout

| Service | Role | Database |
|---------|------|----------|
| Web (Planlet app) | Next.js | Production Postgres via `DATABASE_URL` |
| `planlet-reminders` | Cron worker | **Same** production Postgres via `DATABASE_URL` |

Web and reminders must share the same production database. Do **not** point reminders at a different Postgres URL when applying migrations. Do **not** change production `DATABASE_URL` values as part of routine migration work.

## PomodoroPushJob migration

| Item | Value |
|------|--------|
| Directory | `prisma/migrations/20261019190000_add_pomodoro_push_jobs/` |
| File | `migration.sql` |
| Creates | `"PomodoroPushJob"` |
| Shipped in | commit `c3c90d5` (*Add Pomodoro timer and notification support*) |

Related Pomodoro migrations (apply in order via `migrate deploy`):

1. `20261019180000_add_pomodoro`
2. `20261019190000_add_pomodoro_push_jobs` ← creates `PomodoroPushJob`
3. `20261019200000_add_pomodoro_activities`

## Safest way to apply pending migrations

Use the **web** service’s environment (it already has the correct production `DATABASE_URL`). Prefer Railway CLI so the URL never leaves Railway.

### Option A — Railway CLI (recommended)

From a machine with Railway CLI logged in and linked to the **production** project:

```bash
# 1. Link / select the production web service (not staging)
railway link

# 2. Confirm you are on the production project + web service
railway status

# 3. Apply pending migrations only (no reset, no generate-from-schema)
railway run npm run db:migrate
```

`railway run` executes in the linked service’s environment, so it uses that service’s `DATABASE_URL` without printing or editing it.

### Option B — Railway web shell

1. Open the production **web** service in Railway.
2. Open a shell / one-off command on that service.
3. Run:

```bash
npm run db:migrate
```

### Forbidden in production

Do **not** run:

- `prisma migrate dev`
- `prisma migrate reset`
- `prisma db push`

Those can create drift, require interactive prompts, or destroy data.

## Order of operations for schema releases

1. Merge migration files to `main` and let Railway deploy the new code.
2. **Immediately** run `npm run db:migrate` / `prisma migrate deploy` against production (Option A or B).
3. Confirm the cron worker succeeds (`planlet-reminders` logs show a normal exit, not a missing-table error).
4. Only then treat push / Pomodoro completion jobs as healthy.

If the reminders service is already crashing, apply migrations as soon as possible — that is the fix. No Railway config change is required for this table to appear.

## Verify `PomodoroPushJob` exists

After migrate deploy, using the **same** production database:

**SQL (Railway Postgres query / `psql`):**

```sql
SELECT to_regclass('public."PomodoroPushJob"');
-- expect: PomodoroPushJob
```

Or:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'PomodoroPushJob';
```

**Prisma migration history:**

```bash
railway run npx prisma migrate status
```

Expect the Pomodoro migrations listed as applied, with no pending migrations.

**Cron smoke check:**

Re-run or wait for `planlet-reminders`. Logs should include a successful `[cron:pomodoro-push] Summary:` line without `PomodoroPushJob` / table-does-not-exist errors.

## Checklist when shipping new migrations

- [ ] Migration folder committed under `prisma/migrations/`
- [ ] Production web deploy from `main` completed (or at least the migration files are on the revision you run)
- [ ] `railway run npm run db:migrate` against **production web** service
- [ ] `prisma migrate status` shows no pending migrations
- [ ] Table verified in Postgres
- [ ] `planlet-reminders` cron completes without schema errors
