# Planlet smoke test checklist

Quick manual checks before sharing a build or after deploying.

## Local

Prerequisites: `.env` configured, PostgreSQL running, migrations applied (`./scripts/migrate.sh`).

- [ ] `./scripts/dev.sh` starts without errors
- [ ] Open http://localhost:3000
- [ ] Sign in with Google
- [ ] Create today's plan from `/today`
- [ ] Add a Farsi item (e.g. `کافه با نینا`) — text displays correctly with `dir="auto"`
- [ ] Add a subtask under that item
- [ ] Mark an item partial, then done — status icons update
- [ ] Go to `/plans/new`, paste Farsi plan text, click **Structure plan**
- [ ] Review parsed plan, save (or append to today if DAY)
- [ ] Record audio on `/plans/new` → **Transcribe** → edit transcript → structure
- [ ] Open saved plan, **Share** → copy plan / update text
- [ ] Visit `/insights` — summary reflects current month activity
- [ ] Visit `/settings` — account info and feature status look correct
- [ ] Visit `/dashboard` — today summary and navigation cards work
- [ ] Sign out

## Production (Railway)

Prerequisites: env vars set, `npx prisma migrate deploy` run once against production DB.

- [ ] App URL loads over HTTPS
- [ ] Sign in with Google (redirect URI configured for production domain)
- [ ] Create today's plan
- [ ] AI parse on `/plans/new` (requires `OPENAI_API_KEY`)
- [ ] Audio transcription on `/plans/new` (microphone + HTTPS)
- [ ] Share copy stores `ShareExport` after clipboard success
- [ ] Install PWA on phone (Add to Home Screen)
- [ ] Open installed app — lands on protected routes after sign-in

## Not in MVP scope

- Google Calendar sync
- Cross-app integrations
- Advanced analytics beyond `/insights`
