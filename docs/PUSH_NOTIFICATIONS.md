# Push notification reminders

Planlet can send optional Web Push reminders for morning planning and evening review.

## Requirements

- User must enable phone notifications in Settings.
- User must opt in to morning and/or evening reminders separately.
- Reminders are generic copy only — no task titles, observations, or gratitude text in payloads.

## Environment variables

### Web service and cron worker

```env
DATABASE_URL=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:your-email@example.com
NODE_ENV=production
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Use the public key for `WEB_PUSH_PUBLIC_KEY`, the private key for `WEB_PUSH_PRIVATE_KEY`, and a `mailto:` contact for `WEB_PUSH_SUBJECT`.

### HTTP cron fallback only

```env
CRON_SECRET=
```

The dedicated Railway cron worker does not need `CRON_SECRET` — it runs the reminder script directly.

## Scheduled reminders

### Recommended: Railway cron service

Run the reminder sender every 10 minutes from a dedicated Railway service in the same repo. Delivery uses a 10-minute window after each configured time, so a reminder set for 09:00 can arrive anytime from 09:00 through 09:09 depending on when the cron run starts.

1. In Railway, create a new service from the same GitHub repo.
2. Name it `planlet-reminders`.
3. Use the same root directory as the web service.
4. Set the start command:

   ```bash
   npm run cron:reminders
   ```

5. Add a cron schedule:

   ```cron
   */10 * * * *
   ```

6. Give it the same required env vars as the web service:

   - `DATABASE_URL` (same Postgres as the web service)
   - `WEB_PUSH_PUBLIC_KEY`
   - `WEB_PUSH_PRIVATE_KEY`
   - `WEB_PUSH_SUBJECT`
   - `NODE_ENV=production`

   `AUTH_SECRET` is not required for the cron worker. Evening reminder copy reads `canUseReflectionFeatures` from the database, not from env.

7. Deploy. Each run executes `scripts/run-reminders-cron.ts`, which calls `runReminderCron()` in `lib/reminders.ts`.

Local test:

```bash
npm run cron:reminders
```

Expected: logs a summary, exits 0 when no reminders are due, sends due reminders when local time falls within the 10-minute window after the configured time, and dedupes via `SentReminder`.

### Fallback: HTTP cron route

Keep for manual testing or if the Railway cron service is not configured:

```
GET /api/cron/reminders
```

Authorize with one of:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`
- `?secret=<CRON_SECRET>`

This route calls the same `runReminderCron()` helper as the CLI script.

Suggested schedule: every 10 minutes. Reminders may arrive up to about 10 minutes after the configured time.

## Reminder delivery window

Each reminder uses a 10-minute send window aligned with the cron schedule:

- Configured time 09:00 → sends on cron runs when local time is 09:00–09:09
- Configured time 21:00 → sends on cron runs when local time is 21:00–21:09
- `SentReminder` still prevents more than one send per user, type, and local date

## Reminder copy

Morning:

- Title: Planlet
- Body: Take a moment to fill today’s plan.
- URL: /today

Evening (reflection-enabled users):

- Body: Review today, update your tasks, and add gratitude.

Evening (other users):

- Body: Review today and update your tasks.

## Duplicate prevention

`SentReminder` records one send per user, reminder type, and local date in the user’s timezone.

## Production deploy

After deploy, run migrations inside the Planlet web service shell:

```bash
npm run db:migrate
```

## iPhone notes

Install Planlet to the Home Screen first, then open it from the icon before enabling notifications.
