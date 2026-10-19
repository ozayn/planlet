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
4. Configure the start command using **one** of these options:

   **Option A (recommended):** Point the service to a dedicated config file.

   - Railway → `planlet-reminders` → Settings → Config-as-code
   - Set config file path: `/railway.reminders.json`
   - This runs `npm run cron:reminders` and sets `restartPolicyType: never` so the worker exits after each run.

   **Option B:** Use the shared `railway.json` with an env var.

   - Leave config file as `/railway.json` (default)
   - Add variable on the `planlet-reminders` service only:

     ```env
     PLANLET_SERVICE_KIND=reminders
     ```

   - The shared start command `npm run start:railway` will run `npm run cron:reminders`.

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

7. Deploy. Each run executes `scripts/run-reminders-cron.ts`, which calls `runReminderCron()` in `lib/reminders.ts` and exits after `prisma.$disconnect()`.

### Web service (`planlet`)

The default `/railway.json` uses `npm run start:railway`, which starts the Next.js server when `PLANLET_SERVICE_KIND` is unset or set to `web`.

Do **not** set `PLANLET_SERVICE_KIND=reminders` on the web service.

Local test:

```bash
PLANLET_SERVICE_KIND=reminders npm run start:railway   # runs cron, exits
PLANLET_SERVICE_KIND=web npm run start:railway         # runs next start
npm run cron:reminders
npm run cron:reminders:debug
npm run cron:reminders -- --debug --at=2026-06-09T13:05:00.000Z
```

Expected: logs timing breakdown, push delivery stats, and a summary; exits within a few seconds. The worker calls `prisma.$disconnect()` before exit so Railway does not keep the service in a long-running state while idle DB connections close.

Timing fields: `loadPreferencesMs`, `timezoneMatchingMs`, `duplicateChecksMs`, `pushSubscriptionLookupMs`, `pushDeliveryMs`, `databaseWritesMs`, `totalMs`.

Push fields: `subscriptionsFound`, `subscriptionsSent`, `subscriptionsFailed`, `subscriptionsTimedOut`, `staleRemoved`.

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

Web Push on iOS requires:

- iOS 16.4+
- Planlet added to the Home Screen (standalone PWA)
- Notification permission granted from that installed app
- An active push subscription saved via Settings

Safari tabs that are not installed as a Home Screen app cannot receive Web Push.

---

## Pomodoro completion push

Pomodoro can schedule a **one-shot Web Push** when a focus or break phase starts. The send time is stored in Postgres (`PomodoroPushJob`) and processed by the same Railway reminders cron worker — not by an in-memory `setTimeout`.

### Opt-in

1. Settings → Pomodoro → **Completion notifications** (requests permission only after the toggle; registers `/api/push/subscribe`).
2. Web Push must be configured (`WEB_PUSH_*` env vars).
3. Optional: Settings → Notifications → phone notifications (same subscription store).

### Lifecycle

| Event | Job action |
|-------|------------|
| Start / resume phase | Cancel pending jobs; insert one job with `sendAt = now + remaining` |
| Pause / stop | Cancel pending jobs |
| Preference duration change while running | Update target duration and reschedule `sendAt` |
| Notifications disabled | Cancel pending jobs |
| Phase completes (client or cron) | Cancel that phase’s pending job; schedule next if auto-start |

Jobs are unique on `transitionToken` so a phase can produce at most one successful push (`pending` → `sending` → `sent`).

### Payload (generic — no task titles)

- Focus: title `Focus complete`, body `Time for a break.`, url `/pomodoro`, kind `focus-complete`
- Break: title `Break complete`, body `Ready for another focus session?`, url `/pomodoro`, kind `break-complete`

### Cron schedule recommendation

Reminders historically used `*/10 * * * *`. For Pomodoro completion timing, prefer **every minute**:

```cron
* * * * *
```

With a 10-minute cron, a 5-minute break completion may arrive several minutes late. The worker still runs `runReminderCron()` then `runPomodoroPushCron()` each invocation.

### Platform limitations (do not over-claim reliability)

Verified delivery depends on the OS and browser. Expect gaps when:

- The browser process is fully suspended / killed
- The device is offline
- Push subscription expired (Planlet removes 404/410 endpoints)
- iOS restrictions above are not met
- Battery / focus modes suppress notifications

**Do not claim reliable background delivery until verified on the target desktop browsers, Android Chrome, and an installed iOS Home Screen PWA.** Manual checks should include: Planlet open, another tab active, browser minimized, phone locked, and installed PWA.
