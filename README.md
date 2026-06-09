# Planlet

A gentle planner for tasks, intentions, and the shape of your days.

Planlet is a mobile-first planning app that turns Farsi/English daily, monthly, and yearly intentions into structured plans. It is not a full calendar replacement.

## Tech stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- Auth.js / NextAuth (Google provider)
- PWA-ready

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

### 3. Set up the database

Ensure PostgreSQL is running and `DATABASE_URL` points to your database, then run:

```bash
npx prisma migrate dev --name init
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local scripts

Shell scripts in `scripts/` wrap common local workflows. Run from anywhere inside the repo:

```bash
./scripts/dev.sh
./scripts/build.sh
./scripts/migrate.sh
./scripts/reset-db.sh
./scripts/prisma-studio.sh
node scripts/generate-icons.mjs   # regenerate PWA/OAuth PNGs from public/logo.svg
```

If a script is not executable:

```bash
chmod +x scripts/*.sh scripts/lib/*.sh
```

Notes:

- `DATABASE_URL` in `.env` must point to a working PostgreSQL database (scripts do not install or start Postgres).
- Google sign-in requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env`.
- `reset-db.sh` asks for confirmation before wiping data — **do not run in production**.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret for Auth.js (e.g. `openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `NEXTAUTH_URL` | Yes (prod) | Canonical app URL (`http://localhost:3000` locally; Railway URL in production). Auth.js v5 also accepts `AUTH_URL` as an alias in many setups — set `NEXTAUTH_URL` for this project. |
| `ALLOWED_EMAILS` | No | Comma-separated Google emails allowed to sign in (case-insensitive, spaces trimmed). When unset or empty, all Google accounts can sign in (useful for local dev). When set, only listed emails get a session. |
| `PLANLET_ADMIN_EMAILS` | No | Comma-separated admin emails. Admins are always allowed to sign in (even if missing from `ALLOWED_EMAILS`) and receive the `ADMIN` role. |
| `PLANLET_AI_PROVIDER` | No | Text plan parser: `openai` (default) or `anthropic` |
| `OPENAI_API_KEY` | No* | OpenAI API key — required for audio transcription; required for text parsing when `PLANLET_AI_PROVIDER=openai` |
| `OPENAI_TRANSCRIBE_MODEL` | No | Transcription model (defaults to `gpt-4o-mini-transcribe`) |
| `ANTHROPIC_API_KEY` | No** | Anthropic API key — required for text parsing when `PLANLET_AI_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | No | Claude model for text parsing (defaults to `claude-sonnet-4-5`) |

\*Required for **Transcribe** on `/plans/new`. Also required for **Structure plan** when using OpenAI as the text parser.

\*\*Required for **Structure plan** when `PLANLET_AI_PROVIDER=anthropic`. Audio transcription always uses OpenAI.

### Text parsing provider

OpenAI handles audio transcription only. Text-to-plan parsing can use OpenAI or Claude:

```bash
# Default — OpenAI for text parsing
PLANLET_AI_PROVIDER=openai
OPENAI_API_KEY=...

# Claude for text parsing (OpenAI still needed for audio transcription)
PLANLET_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-5
```

Keep API keys in `.env` locally and in Railway environment variables in production. Never commit keys to git.

### Private workspace (email allowlist)

Set `ALLOWED_EMAILS` to restrict sign-in to specific Google accounts. The check runs server-side in the Auth.js `signIn` callback — unauthorized users do not receive a session.

```bash
# Owner + invited friend
ALLOWED_EMAILS=your-email@example.com,friend@example.com

# Admin(s) — always allowed; also get ADMIN role and /admin access
PLANLET_ADMIN_EMAILS=your-email@example.com
```

Admin emails are always permitted to sign in, even if they are not listed in `ALLOWED_EMAILS`. This helps avoid admin lockout.

Leave `ALLOWED_EMAILS` empty or unset during local development to avoid accidental lockout. Set both variables in production (e.g. on Railway) to keep the app private.

Admins can open `/admin` to see configured allowlists, per-user usage counts, and recent sign-in activity. The admin page shows **counts only** — not plan titles, item text, or export contents. See [docs/ADMIN.md](docs/ADMIN.md). To add or remove users today, edit `ALLOWED_EMAILS` in environment variables and redeploy.

### In-platform plan sharing

Plan owners can share individual plans with other Planlet users by email on `/plans/[id]` (**Share inside Planlet**). The recipient must have signed in at least once and be in `ALLOWED_EMAILS`. Shared users get read-only access; owners keep full edit access. Copy/export sharing (Telegram/plain text) is unchanged.

Audio recording requires microphone permission and works best on localhost or HTTPS. Recorded audio is sent only to the transcription API and is not stored.

## Prisma

Generate the client after schema changes:

```bash
npx prisma generate
```

Apply migrations locally:

```bash
npx prisma migrate dev
```

Apply migrations in production (non-destructive):

```bash
npm run db:migrate
# or: npx prisma migrate deploy
```

Open Prisma Studio:

```bash
npx prisma studio
```

**Never** run `prisma migrate reset` against a production database.

## Railway deployment

### 1. Create services

1. Create a new [Railway](https://railway.app) project.
2. Add a **PostgreSQL** plugin.
3. Add a **Web Service** from this GitHub repo (or deploy via Railway CLI).

Railway auto-detects Next.js. This repo also includes `railway.json` with explicit build/start commands:

| Phase | Command |
|-------|---------|
| Install | `npm install` (runs `postinstall` → `prisma generate`) |
| Build | `npm run build` |
| Start | `npm run start` |

### 2. Environment variables

Set these on the Web Service (link `DATABASE_URL` from the Postgres plugin):

```bash
DATABASE_URL=          # from Railway Postgres
AUTH_SECRET=           # openssl rand -base64 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_URL=https://your-app.up.railway.app
ALLOWED_EMAILS=your-email@example.com,friend@example.com
PLANLET_ADMIN_EMAILS=your-email@example.com
PLANLET_AI_PROVIDER=openai
OPENAI_API_KEY=        # required for audio; required for text parsing when provider=openai
OPENAI_TRANSCRIBE_MODEL=  # optional
ANTHROPIC_API_KEY=     # required when PLANLET_AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-sonnet-4-5  # optional
```

### 3. Google OAuth

In [Google Cloud Console](https://console.cloud.google.com/), add authorized redirect URI:

```text
https://<your-railway-domain>/api/auth/callback/google
```

For the OAuth consent screen app logo, upload **`public/oauth-logo.png`** (512×512). See [docs/BRANDING.md](docs/BRANDING.md) for palette and icon usage.

### 4. Database migrations

After the first successful deploy, run migrations against the **production** database once:

```bash
railway run npm run db:migrate
```

Or from your machine with production `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

Do **not** use `migrate dev` or `migrate reset` in production.

### 5. Verify

See [docs/SMOKE_TEST.md](docs/SMOKE_TEST.md) for a production checklist.

## Product configuration

The app name, tagline, and PWA metadata live in `config/product.ts`. Day/month boundaries use `config/time.ts` (`APP_TIMEZONE`, default `America/New_York`).

## Before pushing to GitHub

Run the secrets audit script to catch accidental credentials in tracked files:

```bash
./scripts/check-secrets.sh
```

Fix any reported issues before committing. Real secrets belong in `.env` only (never committed).

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy`) |

`postinstall` runs `prisma generate` automatically (safe for Railway builds).
