# Push notification reminders

Planlet can send optional Web Push reminders for morning planning and evening review.

## Requirements

- User must enable phone notifications in Settings.
- User must opt in to morning and/or evening reminders separately.
- Reminders are generic copy only — no task titles, observations, or gratitude text in payloads.

## Environment variables

```env
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:your-email@example.com
CRON_SECRET=
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Use the public key for `WEB_PUSH_PUBLIC_KEY`, the private key for `WEB_PUSH_PRIVATE_KEY`, and a `mailto:` contact for `WEB_PUSH_SUBJECT`.

## Scheduled reminders

Cron endpoint:

```
GET /api/cron/reminders
```

Authorize with one of:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`
- `?secret=<CRON_SECRET>`

Suggested schedule: every 10 minutes.

### Railway cron

Create a Railway cron service that calls your deployed app URL, for example:

```
https://your-app.up.railway.app/api/cron/reminders
```

Send the secret in the `Authorization` header.

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
